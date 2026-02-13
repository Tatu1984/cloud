using Microsoft.AspNetCore.OData.Deltas;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace MDC.Api.Services;

/*
 * Swagger/Scalar/OpenAPI — the generators don't know how to infer the schema of Delta<T>, so they default to showing the raw Delta<T> structure rather than the underlying T.
 */

/// <summary>
/// Schema filter to properly represent OData Delta types in OpenAPI documentation
/// </summary>
/// <typeparam name="T">The underlying entity type</typeparam>
public class DeltaSchemaFilter<T> : ISchemaFilter
{
    /// <summary>
    /// Applies the schema transformation for Delta types
    /// </summary>
    /// <param name="schema">The OpenAPI schema</param>
    /// <param name="context">The schema filter context</param>
    public void Apply(OpenApiSchema schema, SchemaFilterContext context)
    {
        if (context.Type.IsGenericType && context.Type.GetGenericTypeDefinition() == typeof(Delta<>))
        {
            var underlyingType = context.Type.GetGenericArguments()[0];
            var genSchema = context.SchemaGenerator.GenerateSchema(underlyingType, context.SchemaRepository);
            schema.Properties = genSchema.Properties;
            schema.Required = genSchema.Required;
            schema.Type = genSchema.Type;
            // Note: In OpenAPI 3.1/Microsoft.OpenApi 2.0, Reference handling may differ
            if (genSchema.Reference != null)
            {
                schema.Reference = genSchema.Reference;
            }
        }
    }
}
