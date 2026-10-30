// The server side of the lost password flow (its handler): this sample is its own authentication center. No type of it
// is used here: the reference is kept for the engine.
[assembly: CK.Setup.PreserveAssemblyReference( typeof( CK.UserProfile.UserPassword.Lost.PasswordLostCommandHandler ) )]
// The server side of the profile (the IUpdateUserCommand handler).
[assembly: CK.Setup.PreserveAssemblyReference( typeof( CK.UserProfile.UpdateUserCommandHandler ) )]
