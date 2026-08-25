namespace CK.IO.User.UserBanned;

/// <summary>
/// Extends <see cref="Actor.IUserProfile"/> with the banishment state of the user the profile
/// describes.
/// <para>
/// Deliberately a single boolean: the profile answers "may this user use the application", not "why
/// and until when". The reason and the end date belong to the administration screens, which read
/// <c>CK.tUserBanned</c> through the workspace user list.
/// </para>
/// <para>
/// Lives in the application for now, under its final namespace: it is meant to move to the
/// <c>CK.IO.User.UserBanned</c> package once the feature has proved itself, which then makes it a
/// file move rather than a rewrite.
/// </para>
/// </summary>
public interface IUserProfile : Actor.IUserProfile
{
    /// <summary>
    /// Gets or sets whether a banishment is currently active for this user, that is whether now falls
    /// inside one of its [BanStartDate, BanEndDate[ windows.
    /// </summary>
    public bool IsBanned { get; set; }
}
