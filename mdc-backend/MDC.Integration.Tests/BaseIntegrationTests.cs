using Azure.Identity;
using MDC.Core.Tests;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Graph;
using System.Reflection;
using Xunit.Sdk;

namespace MDC.Integration.Tests;

public abstract class BaseIntegrationTests : BaseServicesTests
{
    // private const string THEORY_CONFIGURATION_SECTION = "theory";
    /*
     * secrets.json file is used to load the configuration.
     * It should have the following structure such that each theory can override the configuration for testing against different environments.
     
{
    "ZeroTierService": {
        "baseUrl": "http://10.255.255.2:4000/",
        "username": "admin",
        "password": "*****",
        "validateServerCertificate": false
      },
      "MDCEndpointService": {
        "mgmtNetworkId": "a972acb27b930a04"
      },
      "ConnectionStrings": {
        "DefaultConnection": "Server=tcp:microdatacenter.database.windows.net,1433;Initial Catalog=microdatacenter;Persist Security Info=False;User ID=microdatacenter-server-admin;Password=*****;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=60;"
      },
      "API_RUN_DB_MIGRATIONS": false,
      "<TestConfigurationTheoryDataAttribute>": {
        "<class data key>": <test class specific data>
    }
}
    
     * Each theory will receive a IConfigurationSection corresponding to its configuration key under the "TestConfigurationTheoryDataAttribute" section.
     */

    public static IEnumerable<TheoryDataRow<IConfigurationSection>> GetTheoryDataRows(string theoryConfigurationSection)
    {
        ConfigurationManager configurationManager = new ConfigurationManager();
        configurationManager.AddUserSecrets(Assembly.GetExecutingAssembly());
        foreach (var section in configurationManager.GetSection(theoryConfigurationSection).GetChildren())
        {
            var row = new TheoryDataRow<IConfigurationSection>(section)
                .WithTestDisplayName($"{theoryConfigurationSection}.{section.Key}");
                //.WithTrait("TheoryConfigurationKey", section.Key);
            if (!System.Diagnostics.Debugger.IsAttached)
                row.Skip = "Integration Tests require debugger to be attached";
            yield return row;
        }
    }

    internal IServiceScope AssembleIntegrationTest(IServiceCollection serviceDescriptors, IConfigurationSection? theoryConfiguration)
    {
        if (!System.Diagnostics.Debugger.IsAttached)
        {
            throw SkipException.ForSkip("Integration Tests require debugger to be attached");
        }

        // Build the configuration
        ConfigurationBuilder configurationBuilder = new ConfigurationBuilder();
        configurationBuilder.AddUserSecrets(Assembly.GetExecutingAssembly());

        var configuration = configurationBuilder.Build();
        Assert.NotNull(configuration);

        // Add an override configuration from the appsettings.json file
        if (theoryConfiguration != null)
        {
            ConfigurationBuilder overrideConfigurationBuilder = new ConfigurationBuilder();
            overrideConfigurationBuilder.AddConfiguration(configuration);

            // Copy all of the children of the override section to the configuration builder
            var children = theoryConfiguration
                .GetChildren()
                .SelectMany(child => child.AsEnumerable(), (section, entry) => new KeyValuePair<string, string?>(entry.Key.Remove(0, theoryConfiguration.Path.Length  + 1), entry.Value))
                .ToArray();
            Assert.NotNull(children);

            overrideConfigurationBuilder.AddInMemoryCollection(children);
    
            configuration = overrideConfigurationBuilder.Build();
        }

        serviceDescriptors.TryAddSingleton<GraphServiceClient>(sp =>
        {
            // The client credentials flow requires that you request the
            // /.default scope, and pre-configure your permissions on the
            // app registration in Azure. An administrator must grant consent
            // to those permissions beforehand.
            var scopes = new[] { "https://graph.microsoft.com/.default" };
            var clientId = configuration["AzureAd:ClientId"];
            var tenantId = configuration["AzureAd:TenantId"]; 
            var clientSecret = configuration["AzureAd:ClientSecret"];

            var authProvider = new ClientSecretCredential(tenantId, clientId, clientSecret);
            return new GraphServiceClient(authProvider, scopes);
        });

        return AssembleServicesTest(serviceDescriptors, configuration, false);
    }
}
