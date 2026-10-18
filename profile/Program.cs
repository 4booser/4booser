using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Xml.Linq;

namespace TtyProfile;

public static class Program
{
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase, PropertyNameCaseInsensitive = true };
    public static async Task<int> Main(string[] args)
    {
        CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
        try
        {
            if (args is ["--self-test"]) { SelfTests.Run(); return 0; }
            if (args is ["--boot"])
            {
                Directory.CreateDirectory("assets");
                await File.WriteAllTextAsync("assets/boot.svg", Renderer.Boot(false));
                await File.WriteAllTextAsync("assets/boot-mobile.svg", Renderer.Boot(true));
                return 0;
            }
            Snapshot snapshot;
            if (args is ["--render", var path])
                snapshot = JsonSerializer.Deserialize<Snapshot>(await File.ReadAllTextAsync(path), JsonOptions) ?? throw new InvalidDataException("Empty snapshot.");
            else if (args is [] or ["--fetch"])
            {
                var token = Environment.GetEnvironmentVariable("GH_TOKEN");
                if (string.IsNullOrWhiteSpace(token)) throw new InvalidOperationException("Set GH_TOKEN, or use --render data/profile.json for offline rendering.");
                var login = Environment.GetEnvironmentVariable("PROFILE_LOGIN") ?? "4booser";
                using var github = new GitHubApi(token);
                snapshot = await github.Fetch(login, DateTimeOffset.UtcNow);
            }
            else throw new ArgumentException("Usage: --fetch | --render <snapshot.json> | --self-test | --boot");

            // Generate and validate everything before touching the last successful output.
            var output = new Dictionary<string, string> {
                ["assets/boot.svg"] = Renderer.Boot(false), ["assets/boot-mobile.svg"] = Renderer.Boot(true),
                ["assets/telemetry.svg"] = Renderer.Telemetry(snapshot, false), ["assets/telemetry-mobile.svg"] = Renderer.Telemetry(snapshot, true),
                ["assets/languages.svg"] = Renderer.Languages(snapshot, false), ["assets/languages-mobile.svg"] = Renderer.Languages(snapshot, true),
                ["data/profile.json"] = JsonSerializer.Serialize(snapshot, JsonOptions) + "\n"
            };
            foreach (var (file, content) in output.Where(e => e.Key.EndsWith(".svg", StringComparison.Ordinal)))
                _ = XDocument.Parse(content);
            var readme = await File.ReadAllTextAsync("README.md");
            readme = ReplaceSection(readme, "TELEMETRY", Summary(snapshot));
            readme = ReplaceSection(readme, "RECENT", Recent(snapshot));
            output["README.md"] = readme;
            foreach (var (file, content) in output)
            {
                var directory = Path.GetDirectoryName(file);
                if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
                await File.WriteAllTextAsync(file, content, new UTF8Encoding(false));
            }
            Console.WriteLine($"Generated {output.Count} files for {snapshot.Login}; {Statistics.Calculate(snapshot).Total} contributions across {snapshot.Days.Count} days.");
            return 0;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine($"Profile update failed: {error.Message}");
            return 1;
        }
    }

    public static string ReplaceSection(string readme, string name, string content)
    {
        var pattern = $"<!-- {name}:START -->.*?<!-- {name}:END -->";
        if (Regex.Matches(readme, pattern, RegexOptions.Singleline).Count != 1)
            throw new InvalidDataException($"Expected exactly one {name} section in README.md.");
        return Regex.Replace(readme, pattern, _ => $"<!-- {name}:START -->\n{content.Trim()}\n<!-- {name}:END -->", RegexOptions.Singleline);
    }

    private static string Summary(Snapshot s)
    {
        var m = Statistics.Calculate(s);
        var b = s.Breakdown;
        var text = new StringBuilder();
        text.AppendLine($"Snapshot: **{s.UpdatedAt.UtcDateTime:yyyy-MM-dd HH:mm} UTC**. Window: **{s.From:yyyy-MM-dd} → {s.Through:yyyy-MM-dd}**.");
        text.AppendLine("\n| Metric | Value |\n| :-- | --: |");
        foreach (var row in new (string Name, int Value)[] {
            ("Contributions / 365 days",m.Total), ("Active days / 365 days",m.ActiveDays), ("Current streak / days",m.CurrentStreak),
            ("Longest streak / days within window",m.LongestStreak), ("Contributions / 30 days",m.Last30), ("Active days / 30 days",m.ActiveLast30),
            ("Commit contributions",b.Commits), ("Pull requests",b.PullRequests), ("Issues",b.Issues), ("Code reviews",b.Reviews),
            ("Public repositories / including forks",s.PublicRepositories), ("Stars / public owned non-fork repos",m.Stars), ("Followers",s.Followers) })
            text.AppendLine($"| {row.Name} | {Renderer.Number(row.Value)} |");
        text.AppendLine($"\nGitHub member since **{s.JoinedAt:yyyy-MM-dd}**.");
        var languages = Statistics.Languages(s);
        if (languages.Count > 0)
        {
            text.AppendLine("\n| Language | Code bytes |\n| :-- | --: |");
            foreach (var l in languages) text.AppendLine($"| {l.Name.Replace("|", "\\|")} | {l.Bytes:N0} |");
        }
        return text.ToString();
    }

    private static string Recent(Snapshot s)
    {
        var text = new StringBuilder("| Repository | Last push / UTC |\n| :-- | :-- |\n");
        foreach (var r in s.Repositories.Where(r => r.Name != s.Login && r.PushedAt is not null).OrderByDescending(r => r.PushedAt).Take(5))
            text.AppendLine($"| [{r.Name.Replace("_", "\\_")}]({r.Url}) | {r.PushedAt!.Value.UtcDateTime:yyyy-MM-dd HH:mm} |");
        return text.ToString();
    }
}
