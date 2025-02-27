namespace ResumeTimeline.Server.Models
{
    public class Project
    {
        public int Id { get; set; }
        public DateOnly Date { get; set; }

        public string? Name { get; set; }

        public string? Summary { get; set; }
        public List<Technology>? Technologies { get; set; }
    }
}
