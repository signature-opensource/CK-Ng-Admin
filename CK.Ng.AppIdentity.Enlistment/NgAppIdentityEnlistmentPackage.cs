using CK.AppIdentity;
using CK.Core;
using CK.IO.AppIdentity.Enlistment;
using CK.Ng.Cris.AspNet.Authentication;
using CK.TypeScript;

namespace CK.Ng.AppIdentity.Enlistment;

/// <summary>
/// The approval page of the System (see <see cref="EnlistPageComponent"/>): a client application built with this package
/// has the "Enlistment" fact, so its party hosts the "Enlistment" route of the System and the pending approvals of the
/// System reach it.
/// </summary>
[TypeScriptPackage]
[Requires<NgCrisAuthenticationPackage>]
[PartyClientFact( "Enlistment" )]
[RegisterTypeScriptType( typeof( IApprovePartyCommand ) )]
public class NgAppIdentityEnlistmentPackage : TypeScriptPackage
{
}
