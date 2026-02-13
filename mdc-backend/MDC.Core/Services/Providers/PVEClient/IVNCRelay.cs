using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.WebSockets;
using System.Text;
using System.Threading.Tasks;

namespace MDC.Core.Services.Providers.PVEClient;

/// <summary/>
public interface IVNCRelay
{
    /// <summary/>
    Task HandleSessionAsync(WebSocket browserSocket, VNCSession vNCSession, CancellationToken cancellationToken = default);
}
