namespace TtyProfile;

public sealed record ContributionDay(DateOnly Date, int Count);
public sealed record LanguageBytes(string Name, long Bytes);
public sealed record PublicRepository(string Name, string Url, DateTimeOffset? PushedAt, int Stars, bool Archived, List<LanguageBytes> Languages);
public sealed record Breakdown(int Commits, int PullRequests, int Issues, int Reviews);
public sealed record Snapshot(string Login, DateTimeOffset UpdatedAt, DateTimeOffset JoinedAt,
    DateOnly From, DateOnly Through, int PublicRepositories, int Followers,
    int RestrictedContributions, Breakdown Breakdown,
    List<ContributionDay> Days, List<PublicRepository> Repositories);
public sealed record Metrics(int Total, int ActiveDays, int CurrentStreak, int LongestStreak,
    int Last30, int ActiveLast30, int Stars, ContributionDay? BusiestDay);

public static class Statistics
{
    public static void ValidateDays(IReadOnlyList<ContributionDay> days, DateOnly from, DateOnly through)
    {
        if (through < from || days.Count != through.DayNumber - from.DayNumber + 1)
            throw new InvalidDataException("The contribution calendar is incomplete.");
        for (var i = 0; i < days.Count; i++)
            if (days[i].Date != from.AddDays(i) || days[i].Count < 0)
                throw new InvalidDataException("The contribution calendar has missing, duplicate, or invalid days.");
    }

    public static Metrics Calculate(Snapshot snapshot)
    {
        ValidateDays(snapshot.Days, snapshot.From, snapshot.Through);
        var current = 0;
        var last = snapshot.Days.Count - 1;
        if (last >= 0 && snapshot.Days[last].Count == 0) last--;
        for (var i = last; i >= 0 && snapshot.Days[i].Count > 0; i--) current++;
        var longest = 0;
        var run = 0;
        foreach (var day in snapshot.Days)
        {
            run = day.Count > 0 ? run + 1 : 0;
            longest = Math.Max(longest, run);
        }
        var recent = snapshot.Days.Where(d => d.Date >= snapshot.Through.AddDays(-29)).ToList();
        return new Metrics(snapshot.Days.Sum(d => d.Count), snapshot.Days.Count(d => d.Count > 0),
            current, longest, recent.Sum(d => d.Count), recent.Count(d => d.Count > 0),
            snapshot.Repositories.Sum(r => r.Stars),
            snapshot.Days.Where(d => d.Count > 0).OrderByDescending(d => d.Count).ThenByDescending(d => d.Date).FirstOrDefault());
    }

    public static List<LanguageBytes> Languages(Snapshot snapshot) => snapshot.Repositories
        .Where(r => !r.Archived && !string.Equals(r.Name, snapshot.Login, StringComparison.OrdinalIgnoreCase))
        .SelectMany(r => r.Languages).GroupBy(l => l.Name)
        .Select(g => new LanguageBytes(g.Key, g.Sum(l => l.Bytes)))
        .Where(l => l.Bytes > 0).OrderByDescending(l => l.Bytes).ThenBy(l => l.Name).ToList();
}
