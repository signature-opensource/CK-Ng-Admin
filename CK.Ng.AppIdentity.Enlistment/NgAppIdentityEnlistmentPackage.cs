using CK.AppIdentity;
using CK.Core;
using CK.IO.AppIdentity.Enlistment;
using CK.Ng.Cris.AspNet.Authentication;
using CK.TypeScript;

namespace CK.Ng.AppIdentity.Enlistment;

/// <summary>
/// The approval page of the System (see <see cref="EnlistPageComponent"/>): a client application built with this package
/// has the "Enlistment" fact, so its party is the approval page of the System (the Authentication Center states its URL)
/// and the page asks the pending approvals of the System through the center.
/// </summary>
[TypeScriptPackage]
[Requires<NgCrisAuthenticationPackage>]
[PartyClientFact( "Enlistment", "app-identity/enlist" )]
[RegisterTypeScriptType( typeof( IApprovePartyCommand ) )]
[RegisterTypeScriptType( typeof( IGetPendingApprovalsQCommand ) )]
[RegisterTypeScriptType( typeof( IGetPartyInstancesQCommand ) )]
[RegisterTypeScriptType( typeof( IRemovePartyInstanceCommand ) )]
[RegisterTypeScriptType( typeof( IOpenEnlistmentTicketCommand ) )]
[RegisterTypeScriptType( typeof( IGetEnlistmentTicketsQCommand ) )]
[RegisterTypeScriptType( typeof( IRevokeEnlistmentTicketCommand ) )]
public class NgAppIdentityEnlistmentPackage : TypeScriptPackage
{
}
