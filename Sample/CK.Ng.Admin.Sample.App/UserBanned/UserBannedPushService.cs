using CK.AspNet.ActorChannel;
using CK.Core;
using CK.Cris;
using CK.IO.User.UserBanned;

namespace CK.Ng.Admin.Sample.App.UserBanned;

/// <summary>
/// Pushes a banishment to the sessions of the user it hits, so that the user is ejected the instant an
/// administrator confirms the ban instead of at its next action.
/// <para>
/// This is the only place where the banishment feature and the session channel meet.
/// </para>
/// </summary>
public class UserBannedPushService : IAutoService
{
    /// <summary>
    /// Message type pushed on the session channel. The Angular side matches on this exact string.
    /// </summary>
    public const string BannedMessageType = "banned";

    readonly IActorChannelPush _push;

    public UserBannedPushService( IActorChannelPush push )
    {
        _push = push;
    }

    /// <summary>
    /// Runs right after the banishment handler, in the same try block.
    /// <para>
    /// A post handler rather than an event or a handler override: it is purely additive, so the
    /// handler brought by <c>CK.DB.User.UserBanned</c> stays untouched, and being declared on
    /// <see cref="ISetUserBannedCommand"/> it also catches the workspace-scoped specialization the
    /// administration screen actually sends.
    /// </para>
    /// </summary>
    /// <param name="cmd">The banishment command that just ran.</param>
    /// <param name="result">Its result, which is the only reliable proof that the ban was applied.</param>
    [CommandPostHandler]
    public Task OnUserBannedAsync( ISetUserBannedCommand cmd, ICrisBasicCommandResult result )
    {
        // The handler catches its own SQL failures and reports them through the result instead of
        // throwing - refusing to ban a member of the System group, for one. So the absence of an
        // exception proves nothing here; Success does.
        if( !result.Success ) return Task.CompletedTask;
        // A banishment can be scheduled for later: ejecting the user before it starts would be wrong.
        if( cmd.BanStartDate.HasValue && cmd.BanStartDate.Value > DateTime.UtcNow ) return Task.CompletedTask;
        return _push.PushAsync( cmd.UserId, BannedMessageType );
    }
}
