using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Query;
using Microsoft.AspNetCore.OData.Routing.Controllers;
using Microsoft.Extensions.Logging;
using System.Text.Json.Nodes;

namespace MDC.Api.Controllers
{
    /// <summary>
    /// 
    /// </summary>
    /// <param name="workspaceService"></param>
    /// <param name="logger"></param>
    [ApiController]
    [Authorize(AuthenticationSchemes = "Bearer,ApiKey")]
    public class WorkspacesController(IWorkspaceService workspaceService, ILogger<WorkspacesController> logger) : ODataController
    {
        /// <summary>
        /// 
        /// </summary>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // GET: odata/Workspaces
        [EnableQuery]
        [HttpGet("odata/Workspaces")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Get))]
        public async Task<IActionResult> AllAsync(CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Fetching all Workspaces.");
            return Ok(await workspaceService.GetAllAsync(cancellationToken));
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // GET: odata/Workspaces(1)
        [EnableQuery]
        [HttpGet("odata/Workspaces({key})")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Get))]
        public async Task<IActionResult> SingleAsync([FromRoute] Guid key, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Fetching Workspace '{key}'.", key);
            var item = await workspaceService.GetByIdAsync(key, cancellationToken);
            if (item == null)
            {
                return NotFound("Workspace not found.");
            }

            return Ok(item);
        }

        ///// <summary>
        ///// 
        ///// </summary>
        ///// <param name="address"></param>
        ///// <returns></returns>
        //// GET: odata/Workspaces/GetByAddress(address='0100')
        //[EnableQuery]
        //[HttpGet("odata/Workspaces/GetByAddress(address={address})")]
        //[ApiConventionMethod(typeof(DefaultApiConventions),
        //             nameof(DefaultApiConventions.Get))]
        //public async Task<IActionResult> FetchByAddressAsync([FromRoute] int address)
        //{
        //    var item = await workspaceService.GetByAddressAsync(address);
        //    if (item == null)
        //    {
        //        return NotFound("Workspace not found.");
        //    }

        //    return Ok(item);
        //}

        /// <summary>
        /// Create a new Workspace at the specified siteId using the provided workspace descriptor.
        /// </summary>
        /// <param name="siteId"></param>
        /// <param name="workspace"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // POST: odata/Workspaces
        [HttpPost("odata/Workspaces")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Post))]
        public async Task<IActionResult> AddAsync([FromQuery] Guid siteId, [FromBody] WorkspaceDescriptor workspace, CancellationToken cancellationToken = default)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            return Created(await workspaceService.CreateAsync(siteId, workspace, cancellationToken));
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // DELETE odata/Workspaces/1
        [HttpDelete("odata/Workspaces({key})")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Delete))]
        public async Task<IActionResult> RemoveAsync([FromRoute] Guid key, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Removing Workspace '{key}'.", key);
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            await workspaceService.DeleteAsync(key, cancellationToken);
            return NoContent();
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // GET: odata/Workspaces(1)
        // [EnableQuery]
        [HttpGet("odata/Workspaces({key})/Descriptor")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Get))]
        public async Task<IActionResult> GetDescriptorAsync([FromRoute] Guid key, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Fetching WorkspaceDescriptor for Workspace '{key}'.", key);
            var item = await workspaceService.GetWorkspaceDescriptorAsync(key, cancellationToken);
            if (item == null)
            {
                return NotFound("Workspace not found.");
            }

            return Ok(item);
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="workspaceDescriptor"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // PATCH odata/Workspaces/1
        //[HttpPatch("odata/Workspaces({key})/Descriptor")]
        [HttpPut("odata/Workspaces({key})/UpdateDescriptor")]    // Note: custom OData actions do not support the PATCH verb
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Update))]
        public async Task<IActionResult> UpdateDescriptorAsync([FromRoute] Guid key, [FromBody] JsonNode workspaceDescriptor, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Updating WorkspaceDescriptor for Workspace '{key}' with changes '{@workspaceDescriptor}'.", key, workspaceDescriptor);
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            return Updated(await workspaceService.UpdateAsync(key, workspaceDescriptor, cancellationToken));
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="workspaceLockDescriptor"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        [HttpPut("odata/Workspaces({key})/Lock")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Update))]
        public async Task<IActionResult> SetLockAsync([FromRoute] Guid key, [FromBody] WorkspaceLockDescriptor workspaceLockDescriptor, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Updating Lock for Workspace '{key}' with value '{@locked}'.", key, workspaceLockDescriptor.Locked);
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var workspace = await workspaceService.SetWorkspaceLockAsync(key, workspaceLockDescriptor.Locked, cancellationToken);

            return Ok(workspace);
        }
    }
}
