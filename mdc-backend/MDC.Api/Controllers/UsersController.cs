using MDC.Core.Services.Api;
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
    /// <param name="userService"></param>
    /// <param name="logger"></param>
    [ApiController]
    [Authorize(AuthenticationSchemes = "Bearer,ApiKey")]
    public class UsersController(IUserService userService, ILogger<UsersController> logger) : ODataController
    {
        /// <summary>
        /// Get all Users
        /// </summary>
        /// <param name="getUnregisteredUsers"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // GET: odata/Users
        [EnableQuery]
        [HttpGet("odata/Users")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Get))]
        public async Task<IActionResult> AllAsync([FromQuery] bool getUnregisteredUsers = true, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Fetching all Device Configurations.");
            return Ok(await userService.GetAllAsync(getUnregisteredUsers, cancellationToken));
        }

        /// <summary>
        /// Get a registered Azure AD User by Id.
        /// </summary>
        /// <param name="key"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // GET: odata/Users(1)
        [EnableQuery]
        [HttpGet("odata/Users({key})")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Get))]
        public async Task<IActionResult> SingleAsync([FromRoute] Guid key, CancellationToken cancellationToken = default)
        {
            var item = await userService.GetByIdAsync(key, cancellationToken);
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
        //// GET: odata/Users/GetByAddress(address='0100')
        //[EnableQuery]
        //[HttpGet("odata/Users/GetByAddress(address={address})")]
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
        /// Register an Azure AD User to the system.
        /// </summary>
        /// <param name="userDescriptor"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // POST: odata/Users
        [HttpPost("odata/Users")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Post))]
        public async Task<IActionResult> AddAsync([FromBody] UserRegistrationDescriptor userDescriptor, CancellationToken cancellationToken = default)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            return Created(await userService.CreateAsync(userDescriptor, cancellationToken));
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="userUpdateDescriptor"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // PATCH odata/Users/1
        [HttpPatch("odata/Users({key})")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Update))]
        public async Task<IActionResult> UpdateAsync([FromRoute] Guid key, [FromBody] UserUpdateDescriptor userUpdateDescriptor, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Updating Organization '{key}' with changes '{@userUpdateDescriptor}'.", key, userUpdateDescriptor);
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            return Updated(await userService.UpdateAsync(key, userUpdateDescriptor, cancellationToken));
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // DELETE odata/Users/1
        [HttpDelete("odata/Users({key})")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Delete))]
        public async Task<IActionResult> RemoveAsync([FromRoute] Guid key, CancellationToken cancellationToken = default)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            await userService.DeleteAsync(key, cancellationToken);
            return NoContent();
        }
    }
}
