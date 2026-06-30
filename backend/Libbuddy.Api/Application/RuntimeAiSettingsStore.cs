using System.Text.Json;

namespace Libbuddy.Api.Application;

public interface IRuntimeAiSettingsStore
{
    Task<EffectiveAiSettings> GetEffectiveAsync(CancellationToken cancellationToken = default);
    Task<EffectiveAiSettings> SaveAsync(UpdateAiProviderSettingsRequest request, CancellationToken cancellationToken = default);
}

public record EffectiveAiSettings(
    bool HasApiKey,
    string? ApiKey,
    string? KeyPreview,
    string Model,
    string Source,
    DateTime? UpdatedAt);

public class RuntimeAiSettingsStore(
    IConfiguration configuration,
    IWebHostEnvironment environment) : IRuntimeAiSettingsStore
{
    private const string DefaultModel = "gpt-4.1-mini";
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

    private string SettingsPath => Path.Combine(environment.ContentRootPath, "data", "libbuddy.ai-settings.json");

    public async Task<EffectiveAiSettings> GetEffectiveAsync(CancellationToken cancellationToken = default)
    {
        var stored = await ReadStoredAsync(cancellationToken);
        return BuildEffectiveSettings(stored);
    }

    public async Task<EffectiveAiSettings> SaveAsync(UpdateAiProviderSettingsRequest request, CancellationToken cancellationToken = default)
    {
        var stored = await ReadStoredAsync(cancellationToken);
        var apiKey = request.ClearApiKey
            ? null
            : !string.IsNullOrWhiteSpace(request.ApiKey)
                ? request.ApiKey.Trim()
                : stored.ApiKey;
        var model = !string.IsNullOrWhiteSpace(request.Model)
            ? request.Model.Trim()
            : stored.Model ?? ConfigModel();

        var next = new StoredAiSettings(apiKey, model, DateTime.UtcNow);
        Directory.CreateDirectory(Path.GetDirectoryName(SettingsPath)!);
        await File.WriteAllTextAsync(SettingsPath, JsonSerializer.Serialize(next, JsonOptions), cancellationToken);
        return BuildEffectiveSettings(next);
    }

    private async Task<StoredAiSettings> ReadStoredAsync(CancellationToken cancellationToken)
    {
        if (!File.Exists(SettingsPath))
        {
            return new StoredAiSettings(null, null, null);
        }

        try
        {
            var json = await File.ReadAllTextAsync(SettingsPath, cancellationToken);
            return JsonSerializer.Deserialize<StoredAiSettings>(json) ?? new StoredAiSettings(null, null, null);
        }
        catch
        {
            return new StoredAiSettings(null, null, null);
        }
    }

    private EffectiveAiSettings BuildEffectiveSettings(StoredAiSettings stored)
    {
        var configApiKey = configuration["OpenAI:ApiKey"];
        var configModel = ConfigModel();
        var apiKey = !string.IsNullOrWhiteSpace(stored.ApiKey) ? stored.ApiKey : configApiKey;
        var model = !string.IsNullOrWhiteSpace(stored.Model) ? stored.Model : configModel;
        var source = !string.IsNullOrWhiteSpace(stored.ApiKey)
            ? "runtime"
            : !string.IsNullOrWhiteSpace(configApiKey)
                ? "configuration"
                : "not_configured";

        return new EffectiveAiSettings(
            !string.IsNullOrWhiteSpace(apiKey),
            apiKey,
            Preview(apiKey),
            model,
            source,
            stored.UpdatedAt);
    }

    private string ConfigModel() =>
        string.IsNullOrWhiteSpace(configuration["OpenAI:ChatModel"])
            ? DefaultModel
            : configuration["OpenAI:ChatModel"]!;

    private static string? Preview(string? apiKey)
    {
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return null;
        }

        var suffix = apiKey.Length <= 6 ? apiKey : apiKey[^6..];
        return $"••••••{suffix}";
    }

    private sealed record StoredAiSettings(string? ApiKey, string? Model, DateTime? UpdatedAt);
}
