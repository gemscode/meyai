using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using ResumeTimeline.Server.Services;
using ResumeTimeline.Server.Models; // Import the Models namespace
using Microsoft.Extensions.Logging;

namespace ResumeTimeline.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class MatchingController : ControllerBase
    {
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly IMatchingService _matchingService;
        private readonly ILogger<MatchingController> _logger;

        public MatchingController(
            IHubContext<NotificationHub> hubContext,
            IMatchingService matchingService,
            ILogger<MatchingController> logger)
        {
            _hubContext = hubContext ?? throw new ArgumentNullException(nameof(hubContext));
            _matchingService = matchingService ?? throw new ArgumentNullException(nameof(matchingService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        [HttpPost("match")]
        public async Task<IActionResult> Match([FromBody] MatchRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.JobDescription))
            {
                return BadRequest("Job description is required.");
            }

            try
            {
                // Call the Python service
                using (var client = new HttpClient())
                {
                    var pythonRequest = new
                    {
                        resumePath = "./test-resume.docx", 
                        jobDescription = request.JobDescription
                    };

                    var response = await client.PostAsJsonAsync("http://localhost:9192/match", pythonRequest);

                    if (!response.IsSuccessStatusCode)
                    {
                        _logger.LogError($"Python service returned error: {response.StatusCode}");
                        return StatusCode(500, "Error calling matching service");
                    }

                    // The Python service will call back to the matching-complete endpoint
                    return Ok(new { status = "processing" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during matching process: {ErrorMessage}", ex.Message);
                return StatusCode(500, $"Matching failed: {ex.Message}");
            }
        }

        [HttpPost("matching-complete")]
        public async Task<IActionResult> MatchingComplete([FromBody] MatchResult matchResult)
        {
            if (matchResult == null)
            {
                return BadRequest("Match result is required.");
            }

            try
            {
                _logger.LogInformation($"Received matching complete request: {System.Text.Json.JsonSerializer.Serialize(matchResult)}");
                await _hubContext.Clients.All.SendAsync("MatchingComplete", matchResult);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error processing result: {ex.Message}");
                return StatusCode(500, $"Error processing result: {ex.Message}");
            }
        }
    }
}
