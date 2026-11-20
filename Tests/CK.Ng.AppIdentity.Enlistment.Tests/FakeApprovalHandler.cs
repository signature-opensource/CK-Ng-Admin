using CK.Core;
using CK.Cris;
using CK.IO.AppIdentity.Enlistment;

namespace CK.Ng.AppIdentity.Enlistment.Tests;

/// <summary>
/// Stands for the handler of the approvals (CK.AppIdentity.Enlistment):
/// <list type="bullet">
///   <item>"Test/$D" waits on "Test/$Holder", whose code is "1234-5678";</item>
///   <item>"Test/$Multi" waits on "Test/$Holder" (code "1234-5678") and on "Test/$Holder2" (code "2222-3333");</item>
///   <item>"Test/$Worker-3" (a new instance of the template "$Worker-{Name}") waits on "Test/$Holder" (code "1234-5678"),
///   3 keys compete for its approval;</item>
///   <item>nobody waits for any other party;</item>
///   <item>"Test/$Worker-4" is an approved instance of "$Worker-{Name}" held by "Test/$Holder", until it is removed.</item>
/// </list>
/// The outcome of an approval names its holder.
/// </summary>
public sealed class FakeApprovalHandler : IAutoService
{
    public const string Code = "1234-5678";
    public const string Code2 = "2222-3333";

    static readonly DateTime _since = new DateTime( 2026, 11, 10, 8, 0, 0, DateTimeKind.Utc );

    static readonly (string Party, string Holder, string Code, DateTime Since, string? Template)[] _pending =
    [
        ("Test/$D", "Test/$Holder", Code, _since, null),
        ("Test/$Multi", "Test/$Holder", Code, _since.AddMinutes( 5 ), null),
        ("Test/$Multi", "Test/$Holder2", Code2, _since.AddMinutes( 6 ), null),
        ("Test/$Worker-3", "Test/$Holder", Code, _since.AddMinutes( 7 ), "$Worker-{Name}")
    ];

    // The approved instances: a removal removes it.
    static readonly List<(string Party, string Holder, string Template)> _instances = [("Test/$Worker-4", "Test/$Holder", "$Worker-{Name}")];

    [CommandHandler]
    public IList<IPartyApprovalOutcome> Handle( IApprovePartyCommand command, PocoDirectory pocos )
    {
        return _pending.Where( p => p.Party == command.PartyFullName )
                       .Select( p => pocos.Create<IPartyApprovalOutcome>( o =>
                       {
                           o.HolderFullName = p.Holder;
                           o.Status = command.Codes.Contains( p.Code ) ? PartyApprovalStatus.Approved : PartyApprovalStatus.CodeMismatch;
                       } ) )
                       .ToList();
    }

    [CommandHandler]
    public IList<IPendingApproval> Handle( IGetPendingApprovalsQCommand command, PocoDirectory pocos )
    {
        return _pending.Select( p => pocos.Create<IPendingApproval>( a =>
                       {
                           a.PartyFullName = p.Party;
                           a.HolderFullName = p.Holder;
                           a.KeyFingerprint = "FAKE-" + p.Party.Length;
                           a.Kind = "Local";
                           a.Since = p.Since;
                           a.TemplatePartyName = p.Template;
                           a.CompetingKeyCount = p.Party == "Test/$Worker-3" ? 3 : 1;
                       } ) )
                       .ToList();
    }

    [CommandHandler]
    public IList<IPartyInstance> Handle( IGetPartyInstancesQCommand command, PocoDirectory pocos )
    {
        lock( _instances )
        {
            return _instances.Select( i => pocos.Create<IPartyInstance>( p =>
                             {
                                 p.PartyFullName = i.Party;
                                 p.HolderFullName = i.Holder;
                                 p.TemplatePartyName = i.Template;
                             } ) )
                             .ToList();
        }
    }

    [CommandHandler]
    public int Handle( IRemovePartyInstanceCommand command )
    {
        lock( _instances )
        {
            return _instances.RemoveAll( i => i.Party == command.PartyFullName );
        }
    }
}
