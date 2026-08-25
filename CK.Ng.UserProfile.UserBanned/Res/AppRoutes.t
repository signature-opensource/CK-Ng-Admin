create <ts> transformer on "CK/Angular/routes.ts"
begin
    ensure import { bannedGuard } from "@local/ck-gen";

    // Additive on purpose. CK.Ng.UserProfile.UserPassword.Reset writes the whole
    // runGuardsAndResolvers + canActivate block of the private page; writing it again here would
    // produce a duplicate key and silently drop one of the two guards. Anchoring inside the array
    // keeps both, whatever order the two transformers are applied in.
    //
    // The private page is the "" route, and both properties are required: canActivate alone would not
    // re-run while the private page is retained (a navigation back to "" from inside the private
    // area), and runGuardsAndResolvers: 'always' lifts exactly that restriction.
    insert "bannedGuard, " after single "canActivate: [";
end
