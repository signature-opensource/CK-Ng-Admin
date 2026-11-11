using CK.Core;
using CK.Cris;
using CK.IO.AppIdentity.Enlistment;

namespace CK.Ng.AppIdentity.Enlistment.Tests;

/// <summary>
/// Stands for the handler of the approvals (CK.AppIdentity.Enlistment):
/// <list type="bullet">
///   <item>"Test/$D" waits on "Test/$Holder", whose code is "1234-5678", and states that it hosts the "MailSender" route;</item>
///   <item>"Test/$Multi" waits on "Test/$Holder" (code "1234-5678") and on "Test/$Holder2" (code "2222-3333");</item>
///   <item>nobody waits for any other party.</item>
/// </list>
/// The outcome of an approval names its holder, followed by the routes it authorizes when there are some
/// ("Test/$Holder [MailSender]"): a route that the party doesn't state is refused.
/// </summary>
public sealed class FakeApprovalHandler : IAutoService
{
    public const string Code = "1234-5678";
    public const string Code2 = "2222-3333";

    static readonly DateTime _since = new DateTime( 2026, 11, 10, 8, 0, 0, DateTimeKind.Utc );

    static readonly (string Party, string Holder, string Code, DateTime Since, string[] Routes)[] _pending =
    [
        ("Test/$D", "Test/$Holder", Code, _since, ["MailSender"]),
        ("Test/$Multi", "Test/$Holder", Code, _since.AddMinutes( 5 ), []),
        ("Test/$Multi", "Test/$Holder2", Code2, _since.AddMinutes( 6 ), [])
    ];

    [CommandHandler]
    public IList<IPartyApprovalOutcome> Handle( IApprovePartyCommand command, PocoDirectory pocos )
    {
        return _pending.Where( p => p.Party == command.PartyFullName )
                       .Select( p => pocos.Create<IPartyApprovalOutcome>( o =>
                       {
                           o.HolderFullName = command.Routes.Count > 0 ? $"{p.Holder} [{string.Join( ", ", command.Routes )}]" : p.Holder;
                           o.Status = !command.Codes.Contains( p.Code )
                                        ? PartyApprovalStatus.CodeMismatch
                                        : command.Routes.All( p.Routes.Contains ) ? PartyApprovalStatus.Approved : PartyApprovalStatus.Refused;
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
                           a.Routes.AddRange( p.Routes );
                       } ) )
                       .ToList();
    }
}
