using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Query;
using Microsoft.AspNetCore.OData.Routing.Controllers;
using Microsoft.Extensions.Logging;

namespace MDC.Api.Controllers
{
    /// <summary>
    /// 
    /// </summary>
    /// <param name="remoteNetworkService"></param>
    /// <param name="logger"></param>
    [ApiController]
    [Authorize(AuthenticationSchemes = "Bearer,ApiKey")]
    public class RemoteNetworksController(IRemoteNetworkService remoteNetworkService, ILogger<RemoteNetworksController> logger) : ODataController
    {
        /// <summary>
        /// 
        /// </summary>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // GET: odata/RemoteNetworks
        [EnableQuery]
        [HttpGet("odata/RemoteNetworks")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Get))]
        public async Task<IActionResult> AllAsync(CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Fetching all Remote Networks.");
            return Ok(await remoteNetworkService.GetAllAsync(cancellationToken));
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // GET: odata/RemoteNetworks(1)
        [EnableQuery]
        [HttpGet("odata/RemoteNetworks({key})")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Get))]
        public async Task<IActionResult> SingleAsync([FromRoute] Guid key, CancellationToken cancellationToken = default)
        {
            var item = await remoteNetworkService.GetByIdAsync(key, cancellationToken);
            if (item == null)
            {
                return NotFound("Remote Network not found.");
            }

            return Ok(item);
        }

        ///// <summary>
        ///// 
        ///// </summary>
        ///// <param name="organizationDescriptor"></param>
        ///// <param name="cancellationToken"></param>
        ///// <returns></returns>
        //// POST: odata/RemoteNetworks
        //[HttpPost("odata/RemoteNetworks")]
        //[ApiConventionMethod(typeof(DefaultApiConventions),
        //             nameof(DefaultApiConventions.Post))]
        //public async Task<IActionResult> AddAsync([FromBody] OrganizationDescriptor organizationDescriptor, CancellationToken cancellationToken = default)
        //{
        //    if (!ModelState.IsValid)
        //    {
        //        return BadRequest(ModelState);
        //    }

        //    return Created(await remoteNetworkService.CreateAsync(organizationDescriptor, cancellationToken));
        //}

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="update"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // PATCH odata/RemoteNetworks/1
        [HttpPut("odata/RemoteNetworks({key})")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Put))]
        public async Task<IActionResult> UpdateAsync([FromRoute] Guid key, [FromBody] RemoteNetworkUpdate update, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Updating Remote Network '{key}' with changes '{@update}'.", key, update);
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            return Updated(await remoteNetworkService.UpdateAsync(key, update, cancellationToken));
        }

        ///// <summary>
        ///// 
        ///// </summary>
        ///// <param name="key"></param>
        ///// <param name="cancellationToken"></param>
        ///// <returns></returns>
        //// DELETE odata/RemoteNetworks/1
        //[HttpDelete("odata/RemoteNetworks({key})")]
        //[ApiConventionMethod(typeof(DefaultApiConventions),
        //             nameof(DefaultApiConventions.Delete))]
        //public async Task<IActionResult> RemoveAsync([FromRoute] Guid key, CancellationToken cancellationToken = default)
        //{
        //    if (!ModelState.IsValid)
        //    {
        //        return BadRequest(ModelState);
        //    }

        //    await remoteNetworkService.DeleteAsync(key, cancellationToken);
        //    return NoContent();
        //}
    }
}
