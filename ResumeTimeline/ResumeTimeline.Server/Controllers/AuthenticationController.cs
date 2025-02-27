using Microsoft.AspNetCore.Mvc;
using System;
using System.IO;
using System.Collections.Generic;

namespace ResumeTimeline.Server.Controllers
{
    
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class AuthenticationController : ControllerBase
    {
        private readonly ILogger<AuthenticationController> _logger;
        private static Dictionary<string, UserInfo> _userMap = new Dictionary<string, UserInfo>();

        public AuthenticationController(ILogger<AuthenticationController> logger)
        {
            _logger = logger;
        }

        [HttpPost("initialize")]
        public IActionResult Initialize()
        {
            try
            {
                var userId = Guid.NewGuid().ToString();
                var userFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", userId);

                // Create user directory
                Directory.CreateDirectory(userFolder);

                // Store user info in memory map
                _userMap[userId] = new UserInfo
                {
                    UserId = userId,
                    FolderPath = userFolder
                };

                _logger.LogInformation($"Initialized new user: {userId}");

                return Ok(new { userId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initializing user");
                return StatusCode(500, $"Error initializing user: {ex.Message}");
            }
        }

        [HttpGet("user-info/{userId}")]
        public IActionResult GetUserInfo(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return BadRequest("User ID is required");
            }

            if (_userMap.TryGetValue(userId, out var userInfo))
            {
                return Ok(userInfo);
            }

            // If not in memory, try to find on disk
            var userFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", userId);
            if (Directory.Exists(userFolder))
            {
                // Create user info and add to map
                userInfo = new UserInfo
                {
                    UserId = userId,
                    FolderPath = userFolder
                };

                // Look for resume file
                var files = Directory.GetFiles(userFolder, "*.*", SearchOption.TopDirectoryOnly);
                if (files.Length > 0)
                {
                    userInfo.ResumePath = files[0];
                    userInfo.ResumeFileName = Path.GetFileName(files[0]);
                }

                _userMap[userId] = userInfo;
                return Ok(userInfo);
            }

            return NotFound($"User {userId} not found");
        }

         public static bool UpdateUserInfo(string userId, string resumePath, string resumeFileName)
        {
            if (_userMap.TryGetValue(userId, out var userInfo))
            {
                userInfo.ResumePath = resumePath;
                userInfo.ResumeFileName = resumeFileName;
                return true;
            }
            return false;
        }
    }

   


    public class UserInfo
    {
        public string UserId { get; set; }
        public string FolderPath { get; set; }
        public string ResumePath { get; set; }
        public string ResumeFileName { get; set; }
    }
}
