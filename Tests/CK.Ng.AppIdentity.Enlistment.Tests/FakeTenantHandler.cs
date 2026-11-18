using CK.AppIdentity;
using CK.Core;
using CK.Cris;
using CK.IO.AppIdentity.Tenants;

namespace CK.Ng.AppIdentity.Enlistment.Tests;

/// <summary>
/// Stands for the handlers of the tenant commands (CK.AppIdentity.Tenants), for the tenants page: the application itself
/// is the only host (a party command to it executes here), with one template "Test/Customers" (at most 4 tenants):
/// <list type="bullet">
///   <item>"Configured" (#1) is configured;</item>
///   <item>"Acme" (#2) is a run-time tenant;</item>
///   <item>"Beta" (#1 in its record) is not loaded: its index is taken by "Configured".</item>
/// </list>
/// A creation takes the first free index, a move a free run-time index, a removal forgets the tenant.
/// </summary>
public sealed class FakeTenantHandler : IAutoService
{
    const string Template = "Test/Customers";
    const int Max = 4;

    sealed record Tenant( string Name, int Index, bool IsConfigured, string? Unloaded );

    static readonly List<Tenant> _tenants = [new( "Configured", 1, true, null ), new( "Acme", 2, false, null ), new( "Beta", 1, false, "IndexTaken" )];

    static string FullName( string name ) => $"{Template}/{name}/${name}/#Dev";

    [CommandHandler]
    public IList<string> Handle( IGetTenantHostsQCommand command, CurrentLocalParty current ) => [current.LocalParty.FullName];

    [CommandHandler]
    public IList<ITenantTemplateInfo> Handle( IGetTenantInstancesQCommand command, PocoDirectory pocos )
    {
        lock( _tenants )
        {
            var t = pocos.Create<ITenantTemplateInfo>( t =>
            {
                t.TemplateName = Template;
                t.ConfiguredCount = 1;
                t.MaxInstanceCount = Max;
            } );
            foreach( var x in _tenants )
            {
                t.Instances.Add( pocos.Create<ITenantInstanceInfo>( i =>
                {
                    i.Name = x.Name;
                    i.FullName = FullName( x.Name );
                    i.Index = x.Index;
                    i.IsConfigured = x.IsConfigured;
                    i.UnloadedReason = x.Unloaded;
                    i.UnloadedMessage = x.Unloaded != null ? "Its index 1 is the one of the configured instance 'Configured'." : null;
                } ) );
            }
            return [t];
        }
    }

    [CommandHandler]
    public string? Handle( ICreateTenantInstanceCommand command )
    {
        lock( _tenants )
        {
            if( command.TemplateName != Template || _tenants.Any( t => t.Name.Equals( command.Name, StringComparison.OrdinalIgnoreCase ) ) ) return null;
            var used = _tenants.Where( t => t.Unloaded == null ).Select( t => t.Index ).ToHashSet();
            var index = Enumerable.Range( 2, Max - 1 ).FirstOrDefault( i => !used.Contains( i ) );
            if( index == 0 ) return null;
            _tenants.Add( new Tenant( command.Name, index, false, null ) );
            return FullName( command.Name );
        }
    }

    [CommandHandler]
    public bool Handle( ISetTenantIndexCommand command )
    {
        lock( _tenants )
        {
            int i = _tenants.FindIndex( t => FullName( t.Name ) == command.TenantFullName && !t.IsConfigured );
            if( i < 0 || command.Index < 2 || command.Index > Max || _tenants.Any( t => t.Unloaded == null && t.Index == command.Index ) ) return false;
            _tenants[i] = _tenants[i] with { Index = command.Index, Unloaded = null };
            return true;
        }
    }

    [CommandHandler]
    public bool Handle( IRemoveTenantInstanceCommand command )
    {
        lock( _tenants )
        {
            return _tenants.RemoveAll( t => FullName( t.Name ) == command.TenantFullName && !t.IsConfigured ) > 0;
        }
    }
}
