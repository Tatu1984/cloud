using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Identity.Web;

namespace MDC.Api.Services.Authentication
{
    /// <summary>
    /// Implementation of authentication service
    /// </summary>
    internal class APIKeyAuthenticationService : IAPIKeyAuthenticationService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<APIKeyAuthenticationService> _logger;

        public APIKeyAuthenticationService(IConfiguration configuration, ILogger<APIKeyAuthenticationService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public Task<ClaimsPrincipal?> ValidateApiKeyAsync(string apiKey, CancellationToken cancellationToken = default)
        {
            try
            {
                // Check if API keys are enabled
                var apiKeysEnabled = _configuration.GetValue<bool>("API_KEYS_ENABLED", false);
                if (!apiKeysEnabled)
                {
                    _logger.LogWarning("API key authentication attempted but API keys are disabled");
                    return Task.FromResult<ClaimsPrincipal?>(null);
                }

                // TODO: We should validate against a database (with one way hashes and salts), for now, we'll use configuration
                var validApiKeys = _configuration.GetSection("ValidApiKeys").Get<ApiKeyConfig[]>() ?? Array.Empty<ApiKeyConfig>();
                
                var keyConfig = validApiKeys.FirstOrDefault(k => k.Key == apiKey);
                if (keyConfig == null)
                {
                    _logger.LogWarning("Invalid API key provided: {ApiKeyPrefix}", apiKey?.Substring(0, Math.Min(8, apiKey?.Length ?? 0)));
                    return Task.FromResult<ClaimsPrincipal?>(null);
                }

                // Create claims for the API key user
                var claims = new List<Claim>
                {
                    new Claim(ClaimTypes.Name, keyConfig.Name),
                    new Claim(ClaimTypes.NameIdentifier, keyConfig.UserId),
                    new Claim(ClaimConstants.ObjectId, keyConfig.ObjectId),
                    new Claim(ClaimConstants.Scp, "apk_key"),
                    new Claim(ClaimConstants.Scope, "apk_key")
             //       ,new Claim("auth_type", "api_key")
                };

                // Add roles
                foreach (var role in keyConfig.Roles)
                {
                    claims.Add(new Claim(ClaimTypes.Role, role));
                }

                var identity = new ClaimsIdentity(claims, "ApiKey");
                return Task.FromResult<ClaimsPrincipal?>(new ClaimsPrincipal(identity));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating API key");
                return Task.FromResult<ClaimsPrincipal?>(null);
            }
        }

        public IEnumerable<string> GetUserRoles(ClaimsPrincipal principal)
        {
            if (principal?.Identity?.IsAuthenticated != true)
                return Enumerable.Empty<string>();

            // For Keycloak JWT tokens, roles might be in different claim types
            var roles = new List<string>();

            // Check standard role claims
            roles.AddRange(principal.FindAll(ClaimTypes.Role).Select(c => c.Value));
            
            // Check Keycloak-specific role claims
            roles.AddRange(principal.FindAll("realm_access.roles").Select(c => c.Value));
            roles.AddRange(principal.FindAll("resource_access.roles").Select(c => c.Value));

            return roles.Distinct();
        }

        public bool HasRole(ClaimsPrincipal principal, string requiredRole)
        {
            if (principal?.Identity?.IsAuthenticated != true)
                return false;

            var userRoles = GetUserRoles(principal);
            return userRoles.Contains(requiredRole, StringComparer.OrdinalIgnoreCase);
        }
    }

    /// <summary>
    /// Configuration for API keys
    /// </summary>
    public class ApiKeyConfig
    {
        /// <summary>
        /// The API key value
        /// </summary>
        public string Key { get; set; } = string.Empty;
        
        /// <summary>
        /// The name of the API key user
        /// </summary>
        public string Name { get; set; } = string.Empty;
        
        /// <summary>
        /// The user ID associated with the API key
        /// </summary>
        public string UserId { get; set; } = string.Empty;

        /// <summary>
        /// The unique object Id associated with the API key
        /// </summary>
        public required string ObjectId { get; set; }
        
        /// <summary>
        /// The roles assigned to the API key
        /// </summary>
        public string[] Roles { get; set; } = Array.Empty<string>();
    }
}