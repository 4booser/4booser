using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace TtyProfile;

public sealed class GitHubApi : IDisposable
{
    private readonly HttpClient client;
    public GitHubApi(string token)
    {
        client = new HttpClient { BaseAddress = new Uri("https://api.github.com/"), Timeout = TimeSpan.FromSeconds(60) };
        client.DefaultRequestHeaders.UserAgent.ParseAdd("4booser-tty-profile/1.0");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        client.DefaultRequestHeaders.Accept.ParseAdd("application/vnd.github+json");
        client.DefaultRequestHeaders.Add("X-GitHub-Api-Version", "2022-11-28");
    }

    private async Task<JsonDocument> Query(string query, object variables)
    {
        using var response = await client.PostAsJsonAsync("graphql", new { query, variables });
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"GitHub returned {(int)response.StatusCode}; the previous snapshot is preserved.");
        var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        if (document.RootElement.TryGetProperty("errors", out var errors))
        {
            var message = string.Join("; ", errors.EnumerateArray().Select(e => e.GetProperty("message").GetString()));
            document.Dispose();
            throw new InvalidDataException($"GitHub GraphQL: {message}");
        }
        return document;
    }

    public async Task<Snapshot> Fetch(string login, DateTimeOffset now)
    {
        if (!Regex.IsMatch(login, "^[A-Za-z0-9][A-Za-z0-9-]{0,38}$"))
            throw new ArgumentException("Invalid GitHub login.");
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        var fromDay = today.AddDays(-364);
        var from = fromDay.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc).ToString("O");
        using var profile = await Query("""
            query($login: String!, $from: DateTime!, $to: DateTime!) {
              user(login: $login) {
                login createdAt followers { totalCount }
                repositories(privacy: PUBLIC, ownerAffiliations: [OWNER]) { totalCount }
                contributionsCollection(from: $from, to: $to) {
                  totalCommitContributions totalPullRequestContributions
                  totalIssueContributions totalPullRequestReviewContributions restrictedContributionsCount
                  contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
                }
              }
            }
            """, new { login, from, to = now.UtcDateTime.ToString("O") });
        var user = profile.RootElement.GetProperty("data").GetProperty("user");
        if (user.ValueKind == JsonValueKind.Null) throw new InvalidDataException("The GitHub user was not found.");
        var collection = user.GetProperty("contributionsCollection");
        var calendar = collection.GetProperty("contributionCalendar");
        var days = calendar.GetProperty("weeks").EnumerateArray()
            .SelectMany(w => w.GetProperty("contributionDays").EnumerateArray())
            .Select(d => new ContributionDay(DateOnly.Parse(d.GetProperty("date").GetString()!), d.GetProperty("contributionCount").GetInt32()))
            .Where(d => d.Date >= fromDay && d.Date <= today).OrderBy(d => d.Date).ToList();
        Statistics.ValidateDays(days, fromDay, today);
        if (days.Sum(d => d.Count) != calendar.GetProperty("totalContributions").GetInt32())
            throw new InvalidDataException("The calendar total does not match its daily counts; refusing to publish.");

        var repositories = new List<PublicRepository>();
        string? cursor = null;
        do
        {
            using var result = await Query("""
                query($login: String!, $cursor: String) {
                  user(login: $login) {
                    repositories(first: 100, after: $cursor, privacy: PUBLIC, isFork: false,
                        ownerAffiliations: [OWNER], orderBy: {field: UPDATED_AT, direction: DESC}) {
                      pageInfo { hasNextPage endCursor }
                      nodes { name url isPrivate isFork isArchived stargazerCount pushedAt
                        languages(first: 100) { edges { size node { name } } }
                      }
                    }
                  }
                }
                """, new { login, cursor });
            var connection = result.RootElement.GetProperty("data").GetProperty("user").GetProperty("repositories");
            foreach (var repo in connection.GetProperty("nodes").EnumerateArray())
            {
                // Enforce public-only output even if query permissions or defaults change.
                if (repo.GetProperty("isPrivate").GetBoolean() || repo.GetProperty("isFork").GetBoolean()) continue;
                var languages = repo.GetProperty("languages").GetProperty("edges").EnumerateArray()
                    .Select(l => new LanguageBytes(l.GetProperty("node").GetProperty("name").GetString()!, l.GetProperty("size").GetInt64())).ToList();
                repositories.Add(new PublicRepository(repo.GetProperty("name").GetString()!, repo.GetProperty("url").GetString()!,
                    repo.GetProperty("pushedAt").ValueKind == JsonValueKind.Null ? null : repo.GetProperty("pushedAt").GetDateTimeOffset(),
                    repo.GetProperty("stargazerCount").GetInt32(), repo.GetProperty("isArchived").GetBoolean(), languages));
            }
            var page = connection.GetProperty("pageInfo");
            var nextCursor = page.GetProperty("endCursor").GetString();
            if (!page.GetProperty("hasNextPage").GetBoolean()) break;
            if (string.IsNullOrEmpty(nextCursor) || nextCursor == cursor)
                throw new InvalidDataException("Repository pagination did not advance.");
            cursor = nextCursor;
        } while (true);

        return new Snapshot(user.GetProperty("login").GetString()!, now, user.GetProperty("createdAt").GetDateTimeOffset(), fromDay, today,
            user.GetProperty("repositories").GetProperty("totalCount").GetInt32(), user.GetProperty("followers").GetProperty("totalCount").GetInt32(),
            collection.GetProperty("restrictedContributionsCount").GetInt32(),
            new Breakdown(collection.GetProperty("totalCommitContributions").GetInt32(), collection.GetProperty("totalPullRequestContributions").GetInt32(),
                collection.GetProperty("totalIssueContributions").GetInt32(), collection.GetProperty("totalPullRequestReviewContributions").GetInt32()), days, repositories);
    }

    public void Dispose() => client.Dispose();
}
