using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace MDC.Core.Services.Providers.PVEClient;

internal class PVEClusterStatus
{
    public required string Id { get; set; }
    
    public required string Name { get; set; }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public required PVEClusterStatusType Type { get; set; }

    public int? Local { get; set; }
}

internal enum PVEClusterStatusType
{
    Cluster,
    Node
}