using System.Text.Json.Serialization;

namespace ResumeTimeline.Server.Models
{
    public class MatchRequest
    {
        public string JobDescription { get; set; }
    }

    public class MatchResult
    {
        [JsonPropertyName("match_percentage")]
        public int Match_Percentage { get; set; }

        [JsonPropertyName("top_matches")]
        public List<TopMatch> Top_Matches { get; set; } = new List<TopMatch>(); // Initialize
    }

    public class TopMatch
    {
        [JsonPropertyName("criterion")]
        public string Criterion { get; set; }

        [JsonPropertyName("percentage")]
        public int Percentage { get; set; }
    }
}
