namespace MDC.Shared.Models;

/// <summary />
public class BastionDescriptor
{
    /// <summary />
    public string? TemplateName { get; set; }

    /// <summary />
    public int? TemplateRevision { get; set; }

    /// <summary />
    public VirtualMachineDescriptorOperation? Operation { get; set; }
}
