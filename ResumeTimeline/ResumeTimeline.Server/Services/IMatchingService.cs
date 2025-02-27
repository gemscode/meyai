using ResumeTimeline.Server.Models;

namespace ResumeTimeline.Server.Services
{
    public interface IMatchingService
    {
        Task<MatchResult> ProcessMatching(string jobDescription);
    }
}
