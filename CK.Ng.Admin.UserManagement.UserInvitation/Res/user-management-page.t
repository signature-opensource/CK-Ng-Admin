create <ts> transformer
begin
    // Add InvitationsTable to the barrel import and the component imports.
    inject """
           InvitationsTable,
           """ into <PostPageImports>;
    inject """
           InvitationsTable,
           """ into <PostPageComponentImports>;

    // View child on the invitations table (refreshed after a user/invitation is created).
    inject """
           readonly invitationsTable = viewChild<InvitationsTable>( 'invitationsTable' );
           """ into <PostViewChildren>;

    // Refresh the invitations table when the users tab reports a creation.
    inject """
           void this.invitationsTable()?.getInvitations();
           this.invitationsTable()?.clearSelection();
           """ into <PostOnUserCreated>;
end

create <html> transformer
begin
    // Append the invitations tab after the users tab.
    inject """
           <nz-tab [nzTitle]="'CK.Admin.UserManagement.Tab.Invitations' | translate">
               <ng-template nz-tab>
                   @if ( workspaceId() > 0 ) {
                       <ck-invitations-table
                           #invitationsTable
                           [workspaceId]="workspaceId()" />
                   }
               </ng-template>
           </nz-tab>
           """ into <PostUsersTab>;
end
