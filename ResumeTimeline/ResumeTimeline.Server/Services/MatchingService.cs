using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Diagnostics;
using System.Text.Json;
using ResumeTimeline.Server.Models;

namespace ResumeTimeline.Server.Services
{
    public class MatchingService : IMatchingService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<MatchingService> _logger;

        public MatchingService(IConfiguration configuration, ILogger<MatchingService> logger)
        {
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<MatchResult> ProcessMatching(string jobDescription)
        {
            try
            {
                // Configure the process
                ProcessStartInfo start = new ProcessStartInfo();
                start.FileName = "python"; // Make sure python is in your PATH
                start.Arguments = $"MatchingProcessor.py \"{jobDescription}\"";
                start.UseShellExecute = false;
                start.RedirectStandardOutput = true;
                start.RedirectStandardError = true;
                start.CreateNoWindow = true;

                // Start the process
                using (Process process = Process.Start(start))
                {
                    string output = await process.StandardOutput.ReadToEndAsync();
                    string error = await process.StandardError.ReadToEndAsync();

                    // Await completion and get exit code
                    process.WaitForExit();
                    int exitCode = process.ExitCode;

                    if (exitCode != 0)
                    {
                        _logger.LogError($"Python script failed with exit code {exitCode}: {error}");
                        throw new Exception($"Python script failed: {error}");
                    }
                    else
                    {
                        _logger.LogInformation($"Python script output: {output}");

                        // Attempt deserialization
                        MatchResult matchResult;
                        try
                        {
                            matchResult = JsonSerializer.Deserialize<MatchResult>(output);
                            _logger.LogInformation($"Successfully deserialized response: {JsonSerializer.Serialize(matchResult)}");
                            return matchResult;
                        }
                        catch (JsonException ex)
                        {
                            _logger.LogError(ex, $"Failed to deserialize response from Python: {ex.Message}. Raw response: {output}");
                            throw new Exception("Failed to process results");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during matching process: {ErrorMessage}", ex.Message);
                throw;
            }
        }
    }
}
