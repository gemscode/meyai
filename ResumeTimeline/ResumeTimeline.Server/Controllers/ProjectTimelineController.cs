using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using ResumeTimeline.Server.Models;
using System.IO;
using System.Text.Json;
using Elasticsearch.Net;
using Nest;
using System.Text.Encodings.Web;
using System.Text.Unicode;
using ResumeTimeline.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class ProjectTimelineController : ControllerBase
{
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly IConfiguration _configuration;
    private readonly string _elasticsearchUri;
    private readonly string _elasticsearchIndex;
    private readonly ILogger<ProjectTimelineController> _logger;

    public ProjectTimelineController(IHubContext<NotificationHub> hubContext, IConfiguration configuration, ILogger<ProjectTimelineController> logger)
    {
        _hubContext = hubContext;
        _configuration = configuration;
        _logger = logger;

        _elasticsearchUri = _configuration["ElasticsearchUri"] ?? throw new InvalidOperationException("ElasticsearchUri is not configured.");
        _elasticsearchIndex = _configuration["ElasticsearchIndex"] ?? "resume_index";
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string keyword)
    {
        if (string.IsNullOrEmpty(keyword))
        {
            return BadRequest("Keyword must be provided.");
        }

        try
        {
            var settings = new ConnectionSettings(new Uri(_elasticsearchUri))
                .DefaultIndex(_elasticsearchIndex)
                .EnableDebugMode(apiCallDetails =>
                {
                    _logger.LogInformation("Request: {Request}", apiCallDetails.DebugInformation);
                });

            var client = new ElasticClient(settings);

            var searchResponse = await client.SearchAsync<Dictionary<string, object>>(s => s
                .Query(q => q
                    .MultiMatch(m => m
                        .Query(keyword)
                        .Fields(f => f.Field("text").Field("tags"))
                    )
                )
                .Size(10)
            );

            if (!searchResponse.IsValid)
            {
                _logger.LogError("Elasticsearch query failed: {DebugInformation}", searchResponse.DebugInformation);
                return StatusCode(500, "Failed to retrieve search results from Elasticsearch.");
            }

            var results = searchResponse.Documents.Select(doc => new
            {
                paragraph_id = Convert.ToInt32(doc.GetValueOrDefault("paragraph_id")),
                text = doc.GetValueOrDefault("text")?.ToString(),
                tags = (doc.GetValueOrDefault("tags") as IEnumerable<object>)?.Select(t => t.ToString()).ToArray()
            }).ToList();

            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred during the search: {ErrorMessage}", ex.Message);
            return StatusCode(500, $"An error occurred during the search: {ex.Message}");
        }
    }
    private static readonly string[] Summaries = new[]
    {
            "USAirforce", "MSSupplyChain", "TMobile", "FXDirect", "EBP"
        };

    [HttpGet]
    public ActionResult<IEnumerable<Project>> GetProjects()
    {
        var testProjects = new List<Project>
            {
                new Project { Date = DateOnly.FromDateTime(DateTime.Now), Name = "Project 1", Summary = "USAirforce" },
                new Project { Date = DateOnly.FromDateTime(DateTime.Now), Name = "Project 2", Summary = "MSSupplyChain" },
                new Project { Date = DateOnly.FromDateTime(DateTime.Now), Name = "Project 3", Summary = "TMobile" }
            };

        return Ok(testProjects);
    }

    [HttpPost("upload-resume")]
    public async Task<ActionResult<UploadResponse>> UploadResume(IFormFile resume, [FromForm] string userId)
    {
        if (resume == null || resume.Length == 0)
            return BadRequest("No file uploaded");

        if (string.IsNullOrEmpty(userId))
            return BadRequest("User ID is required");

        try
        {
            var uploadPath = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", userId);

            // Ensure directory exists
            if (!Directory.Exists(uploadPath))
            {
                Directory.CreateDirectory(uploadPath);
            }
            else
            {
                // Clean up existing files
                foreach (var file in Directory.GetFiles(uploadPath))
                {
                    System.IO.File.Delete(file);
                }
            }

            // Save file with original name in the user folder
            var filePath = Path.Combine(uploadPath, resume.FileName);
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await resume.CopyToAsync(stream);
            }

            AuthenticationController.UpdateUserInfo(userId, filePath, resume.FileName);

            await NotifyPythonService(userId);

            var response = new UploadResponse
            {
                FolderId = userId,
                FileName = resume.FileName,
                FileSize = resume.Length,
                Message = $"File {resume.FileName} ({resume.Length / 1024.0:F2} KB) was processed successfully and stored in folder {userId}"
            };
            return Ok(response);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }

    private async Task NotifyPythonService(string folderId)
    {
        using (var client = new HttpClient())
        {
            var request = new
            {
                folderId = folderId,
                basePath = Path.Combine(Directory.GetCurrentDirectory(), "Uploads")
            };

            await client.PostAsJsonAsync("http://localhost:9191/process", request);
        }
    }

    [HttpGet("subscribe/{folderId}")]
    public async Task Subscribe(string folderId)
    {
        Response.Headers.Add("Content-Type", "text/event-stream");
        Response.Headers.Add("Cache-Control", "no-cache");
        Response.Headers.Add("Connection", "keep-alive");
        Response.Headers.Add("Access-Control-Allow-Origin", "*");

        var tcs = new TaskCompletionSource<string>();
        using (MessageBroker.Subscribe(folderId, tcs))
        {
            try
            {
                var notification = await tcs.Task;
                await Response.WriteAsync($"data: {notification}\n\n");
                await Response.Body.FlushAsync();
            }
            catch (Exception ex)
            {
                await Response.WriteAsync($"data: {JsonSerializer.Serialize(new { error = ex.Message })}\n\n");
                await Response.Body.FlushAsync();
            }
        }
    }

    [HttpPost("processing-complete")]
    public async Task<IActionResult> ProcessingComplete([FromBody] ProcessingCompletePayload payload)
    {
        Console.WriteLine("processing-complete ...");
        try
        {
            Console.WriteLine($"Received processing complete request for folder: {payload.FolderId}");

            var resultPath = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", payload.FolderId, "resume-parsing.json");
            Console.WriteLine($"Looking for file at: {resultPath}");

            // Add retry logic with timeout
            int maxRetries = 3;
            int retryDelayMs = 1000;

            for (int i = 0; i < maxRetries; i++)
            {
                var fileInfo = new FileInfo(resultPath);
                fileInfo.Refresh(); // Refresh the file info to get latest status

                if (fileInfo.Exists)
                {
                    // Wait a brief moment to ensure file is completely written
                    await Task.Delay(100);
                    var result = await System.IO.File.ReadAllTextAsync(resultPath);
                    Console.WriteLine($"File found and read, content length: {result.Length}");

                    // Log before SignalR broadcast
                    Console.WriteLine("Broadcasting via SignalR...");

                    await _hubContext.Clients.All.SendAsync("ProcessingComplete", payload.FolderId, result);

                    return Ok();
                }

                if (i < maxRetries - 1)
                {
                    await Task.Delay(retryDelayMs);
                }
            }

            return NotFound("Result file not found after retries");
        }
        catch (Exception ex)
        {
            Console.WriteLine("ERROR ERROR ");
            return StatusCode(500, $"Error processing result: {ex.Message}");
        }
    }

    [HttpGet("get-result/{folderId}")]
    public async Task<IActionResult> GetResult(string folderId)
    {
        try
        {
            var resultPath = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", folderId, "resume-parsing.json");
            if (System.IO.File.Exists(resultPath))
            {
                var result = await System.IO.File.ReadAllTextAsync(resultPath);
                return Ok(result);
            }
            return NotFound();
        }
        catch (Exception ex)
        {
            return StatusCode(500, ex.Message);
        }
    }


    public class UploadResponse
    {
        public string FolderId { get; set; }
        public string FileName { get; set; }
        public long FileSize { get; set; }
        public string Message { get; set; }
    }

    public class ProcessingCompletePayload
    {
        public string FolderId { get; set; }
        public string Status { get; set; }
    }


}
