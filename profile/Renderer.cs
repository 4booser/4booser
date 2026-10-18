using System.Globalization;
using System.Security;
using System.Text;

namespace TtyProfile;

public static class Renderer
{
    public const string Background = "#0b100c";
    public const string Ink = "#dce9d1";
    public const string Green = "#b7eb8f";
    public const string Muted = "#91a48e";
    public const string Edge = "#29392c";
    private static readonly string[] HeatColors = ["#19251c", "#2c4931", "#4d7c44", "#82b865", Green];

    public static string Number(int value) => value.ToString("N0", CultureInfo.InvariantCulture);

    public static string Boot(bool mobile)
    {
        var width = mobile ? 480 : 960;
        var c = new Canvas(width, mobile ? 340 : 312, "4booser / tty01", "Alex, backend and full-stack developer in Kyiv, Ukraine.");
        c.Rect(0, 0, width, 36, Green);
        c.Text(24, 24, "TTY 01 / 4BOOSER", 16, Background, "700");
        if (!mobile) c.Text(936, 24, "PUBLIC SESSION  /  /dev/tty01", 14, Background, anchor: "end");
        c.Text(26, 74, "login: 4booser", 16, Muted);
        c.Text(23, mobile ? 142 : 151, "4booser", mobile ? 70 : 88, Green, "700");
        if (mobile)
        {
            c.Text(26, 180, "Alex / backend developer", 22);
            c.Text(26, 209, "Full-stack. Systems. Curiosity.", 18, Muted);
            c.Rule(234);
            c.Text(26, 266, ".NET / TypeScript / PostgreSQL", 18);
            c.Text(26, 304, "Kyiv, Ukraine", 18, Muted);
            c.Cursor(430, 288, 12, 21);
        }
        else
        {
            c.Text(26, 192, "Alex / backend-first, full-stack when needed.", 23);
            c.Rule(218);
            c.Text(26, 250, "C# / ASP.NET Core / TypeScript / PostgreSQL", 19);
            c.Text(26, 283, "Kyiv, Ukraine    /    building things I can explain.", 16, Muted);
            c.Cursor(915, 264, 12, 22);
        }
        return c.Finish();
    }

    private static void Metric(Canvas c, int x, int y, string label, int value, string detail, bool mobile, bool primary)
    {
        c.Text(x, y, label, mobile ? 18 : 15, Muted);
        var text = Number(value);
        var size = primary ? (text.Length > 7 ? 34 : 43) : 31;
        c.Text(x, y + (primary ? 48 : 37), text, size, primary ? Green : Ink, "700");
        c.Text(x, y + (primary ? 72 : 62), detail, mobile ? 16 : 13, Muted);
    }

    public static string Telemetry(Snapshot snapshot, bool mobile)
    {
        var m = Statistics.Calculate(snapshot);
        var c = new Canvas(mobile ? 480 : 960, mobile ? 1382 : 922, "4booser / GitHub telemetry",
            $"{Number(m.Total)} contributions, {m.ActiveDays} active days, current streak {m.CurrentStreak} days, longest streak {m.LongestStreak} days within {snapshot.From:yyyy-MM-dd} to {snapshot.Through:yyyy-MM-dd}.");
        c.Text(24, 36, mobile ? "$ stats --window=365d" : "4booser@github:~$ stats --window=365d", mobile ? 21 : 20, Green);
        c.Text(24, 67, $"{snapshot.From:yyyy-MM-dd} .. {snapshot.Through:yyyy-MM-dd}", mobile ? 17 : 15, Muted);
        if (mobile) c.Text(24, 94, $"SYNC {snapshot.UpdatedAt.UtcDateTime:yyyy-MM-dd HH:mm} UTC", 15, Muted);
        else c.Text(936, 67, $"SYNC {snapshot.UpdatedAt.UtcDateTime:yyyy-MM-dd HH:mm} UTC", 14, Muted, anchor: "end");
        c.Rule(mobile ? 112 : 90);
        var primary = new (string Label, int Value, string Detail)[] {
            ("CONTRIBUTIONS", m.Total, "in 365 days"), ("ACTIVE DAYS", m.ActiveDays, "with contributions"),
            ("CURRENT STREAK", m.CurrentStreak, "consecutive days"), ("BEST STREAK", m.LongestStreak, "within 365 days") };
        var secondary = new (string Label, int Value, string Detail)[] {
            ("LAST 30 DAYS", m.Last30, $"{m.ActiveLast30} active days"),
            ("PUBLIC REPOS", snapshot.PublicRepositories, "including forks"),
            ("STARS RECEIVED", m.Stars, "owned / non-fork"), ("FOLLOWERS", snapshot.Followers, "GitHub profile") };
        for (var i = 0; i < 4; i++)
        {
            var x = mobile ? 24 + i % 2 * 230 : 26 + i * 233;
            Metric(c, x, mobile ? 143 + i / 2 * 120 : 122, primary[i].Label, primary[i].Value, primary[i].Detail, mobile, true);
            Metric(c, x, mobile ? 385 + i / 2 * 100 : 244, secondary[i].Label, secondary[i].Value, secondary[i].Detail, mobile, false);
        }
        c.Rule(mobile ? 562 : 328);
        c.Text(24, mobile ? 595 : 359, "$ contributions --by-type", mobile ? 19 : 18, Green);
        var b = snapshot.Breakdown;
        if (mobile)
        {
            c.Text(24, 631, $"commits {Number(b.Commits)}", 18);
            c.Text(254, 631, $"PRs {Number(b.PullRequests)}", 18);
            c.Text(24, 661, $"issues  {Number(b.Issues)}", 18);
            c.Text(254, 661, $"reviews {Number(b.Reviews)}", 18);
        }
        else c.Text(24, 390, $"commits {Number(b.Commits)}   PRs {Number(b.PullRequests)}   issues {Number(b.Issues)}   reviews {Number(b.Reviews)}", 18);
        c.Text(24, mobile ? 711 : 437, "$ calendar --contributions", mobile ? 19 : 18, Green);
        c.Text(24, mobile ? 741 : 465, "one cell = one day / brightness = count", mobile ? 16 : 14, Muted);
        var start = snapshot.From.AddDays(-(int)snapshot.From.DayOfWeek);
        var weeks = (snapshot.Through.DayNumber - start.DayNumber) / 7 + 1;
        if (mobile)
        {
            var firstHalf = (weeks + 1) / 2;
            Calendar(c, snapshot, start, firstHalf, 0, 52, 790, 14, 12, 16);
            Calendar(c, snapshot, start, weeks - firstHalf, firstHalf, 52, 959, 14, 12, 16);
            Legend(c, 1097, true);
        }
        else
        {
            Calendar(c, snapshot, start, weeks, 0, 68, 512, 16, 14, 13);
            Legend(c, 660, false);
        }
        c.Text(24, mobile ? 1147 : 710, "$ history --last=30d", mobile ? 19 : 18, Green);
        Trend(c, snapshot, mobile ? 1191 : 752, mobile);
        var busiest = m.BusiestDay is null ? "no recorded contributions" : $"peak {m.BusiestDay.Date:yyyy-MM-dd} / {Number(m.BusiestDay.Count)} contributions";
        c.Text(24, mobile ? 1343 : 886, busiest, mobile ? 16 : 14, Muted);
        return c.Finish();
    }

    private static void Calendar(Canvas c, Snapshot s, DateOnly start, int columns, int offset, int x, int y, int step, int size, int font)
    {
        var byDate = s.Days.ToDictionary(d => d.Date);
        c.Text(x - 41, y + step + size - 2, "M", font, Muted);
        c.Text(x - 41, y + step * 3 + size - 2, "W", font, Muted);
        c.Text(x - 41, y + step * 5 + size - 2, "F", font, Muted);
        var candidates = new List<(int Column, DateOnly Date)>();
        var previousMonth = -1;
        for (var column = 0; column < columns; column++)
        {
            var middle = start.AddDays((column + offset) * 7 + 3);
            if (middle.Month != previousMonth) candidates.Add((column, middle));
            previousMonth = middle.Month;
        }
        var labelSpace = (int)Math.Ceiling((font * 3 * 0.61 + 7) / step);
        var lastLabel = -labelSpace;
        for (var i = 0; i < candidates.Count; i++)
        {
            var label = candidates[i];
            // Omit a short leading partial month instead of crowding the next month.
            if (i == 0 && candidates.Count > 1 && candidates[1].Column - label.Column < labelSpace) continue;
            if (label.Column - lastLabel < labelSpace || (columns - label.Column) * step < font * 3 * 0.61) continue;
            c.Text(x + label.Column * step, y - 14, label.Date.ToString("MMM", CultureInfo.InvariantCulture), font, Muted);
            lastLabel = label.Column;
        }
        for (var column = 0; column < columns; column++)
        {
            var sunday = start.AddDays((column + offset) * 7);
            for (var row = 0; row < 7; row++)
            {
                var date = sunday.AddDays(row);
                if (!byDate.TryGetValue(date, out var day)) continue;
                var level = day.Count switch { 0 => 0, <= 3 => 1, <= 9 => 2, <= 19 => 3, _ => 4 };
                c.Rect(x + column * step, y + row * step, size, size, HeatColors[level], $"{date:yyyy-MM-dd}: {day.Count} contributions");
            }
        }
    }

    private static void Legend(Canvas c, int y, bool mobile)
    {
        string[] names = ["0", "1-3", "4-9", "10-19", "20+"];
        for (var i = 0; i < names.Length; i++)
        {
            var x = (mobile ? 24 : 68) + i * (mobile ? 88 : 126);
            c.Rect(x, y - 12, 12, 12, HeatColors[i]);
            c.Text(x + 18, y, names[i], mobile ? 15 : 14, Muted);
        }
    }

    private static void Trend(Canvas c, Snapshot s, int y, bool mobile)
    {
        var days = s.Days.TakeLast(30).ToList();
        var max = days.Max(d => d.Count);
        var x = mobile ? 52 : 68;
        var step = mobile ? 13 : 28;
        var barWidth = mobile ? 9 : 20;
        const int height = 74;
        c.Line(x, y + height, x + days.Count * step - 4, y + height, Edge);
        c.Text(x - 10, y + 11, Number(max), mobile ? 14 : 13, Muted, anchor: "end");
        c.Text(x - 10, y + height + 4, "0", mobile ? 14 : 13, Muted, anchor: "end");
        for (var i = 0; i < days.Count; i++)
        {
            var value = max == 0 ? 0 : days[i].Count * (double)height / max;
            if (value > 0) c.Rect(x + i * step, y + height - value, barWidth, value, Green,
                $"{days[i].Date:yyyy-MM-dd}: {days[i].Count} contributions");
        }
        c.Text(x, y + height + 28, days[0].Date.ToString("dd MMM", CultureInfo.InvariantCulture), mobile ? 16 : 14, Muted);
        c.Text(x + days.Count * step - 4, y + height + 28, days[^1].Date.ToString("dd MMM", CultureInfo.InvariantCulture), mobile ? 16 : 14, Muted, anchor: "end");
    }

    public static string Languages(Snapshot snapshot, bool mobile)
    {
        var all = Statistics.Languages(snapshot);
        var total = all.Sum(l => l.Bytes);
        var rows = all.Take(5).ToList();
        if (all.Count > 5) rows.Add(new LanguageBytes("Other", all.Skip(5).Sum(l => l.Bytes)));
        var height = (mobile ? 150 : 128) + Math.Max(1, rows.Count) * (mobile ? 63 : 43);
        var c = new Canvas(mobile ? 480 : 960, height, "4booser / repository languages", "Share of code bytes, not skill levels. Public owned non-fork non-archived repositories; the profile repository is excluded.");
        c.Text(24, 35, "$ du --languages --public", mobile ? 20 : 20, Green);
        c.Text(24, 66, mobile ? "code bytes / no forks / no profile repo" : "code bytes / public + owned / no forks / no archived repos / no profile repo", mobile ? 16 : 14, Muted);
        if (rows.Count == 0) c.Text(24, 116, "No language data available.", 18, Muted);
        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            var percentage = row.Bytes * 100.0 / total;
            var label = percentage < 0.1 ? "<0.1%" : percentage.ToString("0.0", CultureInfo.InvariantCulture) + "%";
            var y = 112 + i * (mobile ? 63 : 43);
            var name = row.Name.Length > 18 ? row.Name[..17] + "…" : row.Name;
            c.Text(24, y, name, mobile ? 19 : 18);
            c.Text(mobile ? 456 : 932, y, label, mobile ? 18 : 17, Muted, anchor: "end");
            var trackX = mobile ? 24 : 246;
            var trackY = mobile ? y + 13 : y - 15;
            var trackWidth = mobile ? 432 : 590;
            c.Rect(trackX, trackY, trackWidth, mobile ? 12 : 17, HeatColors[0]);
            c.Rect(trackX, trackY, trackWidth * percentage / 100, mobile ? 12 : 17, Green);
        }
        c.Text(24, height - 20, "repository content != proficiency", mobile ? 16 : 14, Muted);
        return c.Finish();
    }

    private sealed class Canvas
    {
        private readonly StringBuilder svg = new();
        private readonly int width;
        public Canvas(int w, int h, string title, string description)
        {
            width = w;
            svg.Append($"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{w}\" height=\"{h}\" viewBox=\"0 0 {w} {h}\" role=\"img\" aria-labelledby=\"title description\">");
            svg.Append($"<title id=\"title\">{E(title)}</title><desc id=\"description\">{E(description)}</desc>");
            svg.Append("<style>text{font-family:'DejaVu Sans Mono','SFMono-Regular',Consolas,monospace}.cursor{animation:blink 1.2s steps(1,end) infinite}@keyframes blink{50%{opacity:0}}@media(prefers-reduced-motion:reduce){.cursor{animation:none}}</style>");
            Rect(0, 0, w, h, Background);
            svg.Append($"<rect x=\".5\" y=\".5\" width=\"{w - 1}\" height=\"{h - 1}\" fill=\"none\" stroke=\"{Edge}\"/>");
        }
        private static string E(string text) => SecurityElement.Escape(text) ?? "";
        private static string F(double value) => value.ToString("0.###", CultureInfo.InvariantCulture);
        public void Text(int x, int y, string text, int size = 16, string color = Ink, string weight = "400", string anchor = "start") =>
            svg.Append($"<text x=\"{x}\" y=\"{y}\" font-size=\"{size}\" fill=\"{color}\" font-weight=\"{weight}\" text-anchor=\"{anchor}\">{E(text)}</text>");
        public void Rect(double x, double y, double w, double h, string color, string? title = null)
        {
            svg.Append($"<rect x=\"{F(x)}\" y=\"{F(y)}\" width=\"{F(w)}\" height=\"{F(h)}\" fill=\"{color}\">");
            if (title is not null) svg.Append($"<title>{E(title)}</title>");
            svg.Append("</rect>");
        }
        public void Line(int x1, int y1, int x2, int y2, string color) =>
            svg.Append($"<path d=\"M{x1} {y1}H{x2}\" stroke=\"{color}\" stroke-width=\"1\" fill=\"none\"/>");
        public void Rule(int y) => Line(24, y, width - 24, y, Edge);
        public void Cursor(int x, int y, int w, int h) => svg.Append($"<rect class=\"cursor\" x=\"{x}\" y=\"{y}\" width=\"{w}\" height=\"{h}\" fill=\"{Green}\"/>");
        public string Finish() => svg.ToString() + "</svg>\n";
    }
}
