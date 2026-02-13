using MDC.Core.Services.Api;
using MDC.Shared.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Query;
using Microsoft.AspNetCore.OData.Routing.Controllers;
using Microsoft.Extensions.Logging;
using System.Text.Json.Nodes;
using System.Threading;

namespace MDC.Api.Controllers
{
    /// <summary>
    /// 
    /// </summary>
    /// <param name="organizationService"></param>
    /// <param name="logger"></param>
    [ApiController]
    [Authorize(AuthenticationSchemes = "Bearer,ApiKey")]
    public class OrganizationsController(IOrganizationService organizationService, ILogger<OrganizationsController> logger) : ODataController
    {
        /// <summary>
        /// 
        /// </summary>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // GET: odata/Organizations
        [EnableQuery]
        [HttpGet("odata/Organizations")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Get))]
        public async Task<IActionResult> AllAsync(CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Fetching all Device Configurations.");
            return Ok(await organizationService.GetAllAsync(cancellationToken));
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // GET: odata/Organizations(1)
        [EnableQuery]
        [HttpGet("odata/Organizations({key})")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Get))]
        public async Task<IActionResult> SingleAsync([FromRoute] Guid key, CancellationToken cancellationToken = default)
        {
            var item = await organizationService.GetByIdAsync(key, cancellationToken);
            if (item == null)
            {
                return NotFound("Device Configuration not found.");
            }

            return Ok(item);
        }

        ///// <summary>
        ///// 
        ///// </summary>
        ///// <param name="address"></param>
        ///// <returns></returns>
        //// GET: odata/Organizations/GetByAddress(address='0100')
        //[EnableQuery]
        //[HttpGet("odata/Organizations/GetByAddress(address={address})")]
        //[ApiConventionMethod(typeof(DefaultApiConventions),
        //             nameof(DefaultApiConventions.Get))]
        //public async Task<IActionResult> FetchByAddressAsync([FromRoute] string address)
        //{
        //    var item = await Organizationservice.GetByAddressAsync(address);
        //    if (item == null)
        //    {
        //        return NotFound("Device Configuration not found.");
        //    }

        //    return Ok(item);
        //}

        /// <summary>
        /// 
        /// </summary>
        /// <param name="organizationDescriptor"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // POST: odata/Organizations
        [HttpPost("odata/Organizations")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Post))]
        public async Task<IActionResult> AddAsync([FromBody] OrganizationDescriptor organizationDescriptor, CancellationToken cancellationToken = default)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            return Created(await organizationService.CreateAsync(organizationDescriptor, cancellationToken));
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="organizationUpdateDescriptor"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // PATCH odata/Organizations/1
        [HttpPatch("odata/Organizations({key})")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Update))]
        public async Task<IActionResult> UpdateAsync([FromRoute] Guid key, [FromBody] OrganizationUpdateDescriptor organizationUpdateDescriptor, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Updating Organization '{key}' with changes '{@organizationUpdateDescriptor}'.", key, organizationUpdateDescriptor);
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            return Updated(await organizationService.UpdateAsync(key, organizationUpdateDescriptor, cancellationToken));
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // DELETE odata/Organizations/1
        [HttpDelete("odata/Organizations({key})")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Delete))]
        public async Task<IActionResult> RemoveAsync([FromRoute] Guid key, CancellationToken cancellationToken = default)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            await organizationService.DeleteAsync(key, cancellationToken);
            return NoContent();
        }
    }
}
