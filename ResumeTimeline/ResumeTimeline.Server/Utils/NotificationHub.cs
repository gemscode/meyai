using Microsoft.AspNetCore.SignalR;

public class NotificationHub : Hub
{

    public async Task ProcessingComplete(string folderId)
    {
        var resultPath = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", folderId, "resume-parsing.json");
        var result = await File.ReadAllTextAsync(resultPath);
        await Clients.All.SendAsync("ProcessingComplete", folderId, result);
    }
}
