using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace MDC.Core.Services.Providers.PVEClient;

internal class PVENodeStatus
{
    [JsonPropertyName("cpuinfo")]
    public required PVENodeStatusCPUInfo CPUInfo { get; set; }
}
