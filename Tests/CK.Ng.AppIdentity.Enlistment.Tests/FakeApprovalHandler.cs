using CK.Core;
using CK.Cris;
using CK.IO.AppIdentity.Enlistment;

namespace CK.Ng.AppIdentity.Enlistment.Tests;

/// <summary>
/// Stands for the handler of the approvals (CK.AppIdentity.Enlistment): "Test/$D" waits on "Test/$Holder", whose code
/// is "1234-5678"; nobody waits for any other party.
/// </summary>
public sealed class FakeApprovalHandler : IAutoService
{
    public const string Code = "1234-5678";

    [CommandHandler]
    public IList<IPartyApprovalOutcome> Handle( IApprovePartyCommand command, PocoDirectory pocos )
    {
        if( command.PartyFullName != "Test/$D" ) return [];
        return [pocos.Create<IPartyApprovalOutcome>( o =>
        {
            o.HolderFullName = "Test/$Holder";
            o.Status = command.Codes.Contains( Code ) ? PartyApprovalStatus.Approved : PartyApprovalStatus.CodeMismatch;
        } )];
    }
}
