using System.Xml.Linq;

namespace TtyProfile;

public static class SelfTests
{
    private static int passed;
    private static Snapshot Fixture(int[] counts, DateOnly? from = null)
    {
        var start = from ?? new DateOnly(2026, 1, 1);
        return new Snapshot("4booser", DateTimeOffset.Parse("2026-10-18T18:00:00Z"), DateTimeOffset.Parse("2023-07-08T00:00:00Z"),
            start, start.AddDays(counts.Length - 1), 0, 0, 0, new Breakdown(0, 0, 0, 0),
            counts.Select((n, i) => new ContributionDay(start.AddDays(i), n)).ToList(), []);
    }
    private static void Check(string name, bool condition)
    {
        if (!condition) throw new InvalidOperationException($"TEST FAILED: {name}");
        passed++;
        Console.WriteLine($"[ok] {name}");
    }
    private static bool Rejects(Action action)
    {
        try { action(); return false; }
        catch (InvalidDataException) { return true; }
    }
    public static void Run()
    {
        var m = Statistics.Calculate(Fixture([0, 1, 2, 0, 3, 4, 0]));
        Check("today can remain empty without losing yesterday's streak", m.CurrentStreak == 2);
        Check("contributions and active days are different metrics", m.Total == 10 && m.ActiveDays == 4);
        Check("a completed empty day breaks the streak", Statistics.Calculate(Fixture([5, 0, 0])).CurrentStreak == 0);
        Check("a new run can be shorter than the window's record", Statistics.Calculate(Fixture([1, 1, 1, 0, 2])).LongestStreak == 3);
        Check("all active days form one streak", Statistics.Calculate(Fixture([1, 2, 3])).CurrentStreak == 3);
        var empty = Statistics.Calculate(Fixture([0, 0, 0]));
        Check("zero activity is valid data", empty.Total == 0 && empty.LongestStreak == 0 && empty.BusiestDay is null);
        var leap = Fixture([1, 1, 1], new DateOnly(2024, 2, 28));
        Check("leap day is a real calendar day", leap.Days[1].Date == new DateOnly(2024, 2, 29) && Statistics.Calculate(leap).CurrentStreak == 3);
        var month = Statistics.Calculate(Fixture(Enumerable.Repeat(1, 31).ToArray()));
        Check("last 30 days includes today and excludes day 31", month.Last30 == 30 && month.ActiveLast30 == 30);
        var invalid = Fixture([1, 1, 1]);
        Check("missing days are rejected instead of becoming zeros", Rejects(() => Statistics.ValidateDays(invalid.Days.Take(2).ToList(), invalid.From, invalid.Through)));
        Check("duplicate dates are rejected", Rejects(() => Statistics.ValidateDays([invalid.Days[0], invalid.Days[0], invalid.Days[2]], invalid.From, invalid.Through)));
        Check("negative contributions are rejected", Rejects(() => Statistics.Calculate(Fixture([1, -1]))));
        var languages = Fixture([0]) with { Repositories = [
            new("4booser", "https://github.com/4booser/4booser", null, 0, false, [new("C#", 999)]),
            new("Old", "https://github.com/4booser/Old", null, 0, true, [new("C#", 999)]),
            new("A", "https://github.com/4booser/A", null, 0, false, [new("C#", 100), new("A&B<C>", 50)]),
            new("B", "https://github.com/4booser/B", null, 0, false, [new("C#", 200)]) ] };
        Check("language aggregation excludes archived and profile repos", Statistics.Languages(languages)[0].Bytes == 300);
        foreach (var mobile in new[] { false, true })
        {
            _ = XDocument.Parse(Renderer.Boot(mobile));
            _ = XDocument.Parse(Renderer.Languages(languages, mobile));
            var year = Fixture(Enumerable.Range(0, 365).Select(i => i % 23).ToArray());
            var document = XDocument.Parse(Renderer.Telemetry(year, mobile));
            XNamespace ns = "http://www.w3.org/2000/svg";
            var cells = document.Descendants(ns + "rect").Where(r => r.Element(ns + "title")?.Value.StartsWith("2026-", StringComparison.Ordinal) == true).ToList();
            Check($"{(mobile ? "mobile" : "desktop")} renders 365 calendar cells and 29 nonzero trend bars", cells.Count == 394);
        }
        var original = "before\n<!-- X:START -->\nold\n<!-- X:END -->\nafter";
        var replaced = Program.ReplaceSection(original, "X", "$1 literal");
        Check("README updates preserve surrounding content and literal dollars", replaced == "before\n<!-- X:START -->\n$1 literal\n<!-- X:END -->\nafter");
        Check("missing README markers are rejected", Rejects(() => Program.ReplaceSection("custom content", "X", "new")));
        Check("duplicate README sections are rejected", Rejects(() => Program.ReplaceSection(original + original, "X", "new")));
        Console.WriteLine($"{passed} checks passed.");
    }
}
