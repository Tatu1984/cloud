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
    /// <param name="siteService"></param>
    /// <param name="workspaceService"></param>
    /// <param name="logger"></param>
    [ApiController]
    [Authorize(AuthenticationSchemes = "Bearer,ApiKey")]
    public class SitesController(ISiteService siteService, IWorkspaceService workspaceService, ILogger<SitesController> logger) : ODataController
    {
        /// <summary>
        /// 
        /// </summary>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // GET: odata/Sites
        [EnableQuery]
        [HttpGet("odata/Sites")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Get))]
        public async Task<IActionResult> AllAsync(CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Fetching all Sites.");
            return Ok(await siteService.GetAllAsync( cancellationToken));
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // GET: odata/Sites(1)
        [EnableQuery]
        [HttpGet("odata/Sites({key})")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Get))]
        public async Task<IActionResult> SingleAsync([FromRoute] Guid key, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Fetching Site '{key}'.", key);
            var item = await siteService.GetByIdAsync(key, cancellationToken);
            if (item == null)
            {
                return NotFound("Site not found.");
            }

            return Ok(item);
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="siteDescriptor"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // POST: odata/Sites
        [HttpPost("odata/Sites")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Post))]
        public async Task<IActionResult> AddAsync([FromBody] SiteDescriptor siteDescriptor, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Adding Site with Member Address '{memberAddress}'.", siteDescriptor.MemberAddress);
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            return Created(await siteService.CreateAsync(siteDescriptor, cancellationToken));
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="delta"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // PATCH odata/Sites/1
        [HttpPatch("odata/Sites({key})")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Update))]
        public async Task<IActionResult> UpdateAsync([FromRoute] Guid key, [FromBody] JsonNode delta, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Updating Site '{key}' with changes '{@delta}'.", key, delta);
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            
            return Updated(await siteService.UpdateAsync(key, delta, cancellationToken));
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // DELETE odata/Sites/1
        [HttpDelete("odata/Sites({key})")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Delete))]
        public async Task<IActionResult> RemoveAsync([FromRoute] Guid key, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Removing Site '{key}'.", key);
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            await siteService.DeleteAsync(key, cancellationToken);
            return NoContent();
        }

        ///// <summary>
        ///// 
        ///// </summary>
        ///// <param name="key"></param>
        ///// <param name="workspaceDescriptor"></param>
        ///// <param name="cancellationToken"></param>
        ///// <returns></returns>
        //// POST: odata/Sites
        //[HttpPost("odata/Sites({key})/AddWorkspace")]
        //[ApiConventionMethod(typeof(DefaultApiConventions),
        //             nameof(DefaultApiConventions.Post))]
        //public async Task<IActionResult> AddWorkspaceAsync([FromRoute] Guid key, [FromBody] WorkspaceDescriptor workspaceDescriptor, CancellationToken cancellationToken = default)
        //{
        //    logger.LogDebug("Creating Workspace at Site '{key}' with WorkspaceDescriptor '{@workspaceDescriptor}'.", key, workspaceDescriptor);
        //    if (!ModelState.IsValid)
        //    {
        //        return BadRequest(ModelState);
        //    }

        //    // TODO: This needs to return a route to the Workspaces Controller
        //    return Ok(await workspaceService.CreateAsync(key, workspaceDescriptor, cancellationToken));
        //}

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // GET: odata/Sites(1)
        // [EnableQuery]
        [HttpGet("odata/Sites({key})/DownloadableTemplates")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Get))]
        public async Task<IActionResult> GetDownloadableTemplatesAsync([FromRoute] Guid key, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Fetching WorkspaceDescriptor for Workspace '{key}'.", key);
            var item = await siteService.GetDownloadableTemplatesAsync(key, cancellationToken);
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
        /// <param name="downloadTemplateDescriptor"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // POST: odata/Sites
        [HttpPost("odata/Sites({key})/DownloadTemplate")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Post))]
        public async Task<IActionResult> DownloadTemplateAsync([FromRoute] Guid key, [FromBody] DownloadTemplateDescriptor downloadTemplateDescriptor, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Site '{key}' Begin downloading template for '{@downloadTemplateDescriptor}'.", key, downloadTemplateDescriptor);
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // TODO: This needs to return a route to the Workspaces Controller
            return Ok(await siteService.DownloadTemplateAsync(key, downloadTemplateDescriptor, cancellationToken));
        }


        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // GET: odata/Sites(1)/Workspaces
        [EnableQuery]
        [HttpGet("odata/Sites({key})/Workspaces")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Get))]
        public async Task<IActionResult> GetWorkspacesAsync([FromRoute] Guid key, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Fetching Workspaces for Site '{key}'.", key);
            
            var items = await workspaceService.GetAllForSiteAsync(key, cancellationToken);

            return Ok(items);
        }

        /// <summary>
        /// Create a new Workspace at the specified siteId using the provided workspace descriptor.
        /// </summary>
        /// <param name="key"></param>
        /// <param name="workspace"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // POST: odata/Sites(1)/Workspaces
        [HttpPost("odata/Sites({key})/Workspaces")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Post))]
        public async Task<IActionResult> AddWorkspaceAsync([FromRoute] Guid key, [FromBody] WorkspaceDescriptor workspace, CancellationToken cancellationToken = default)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            return Ok(await workspaceService.CreateAsync(key, workspace, cancellationToken));
        }
    }
}
