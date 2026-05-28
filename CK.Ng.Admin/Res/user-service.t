create <ts> transformer
begin
    ensure import { GroupInfos } from '@local/ck-gen';

    inject """
           readonly #isAdmin: WritableSignal<boolean> = computed( () => {
             const adminZone = this.userProfile()?.groups.find( g => g.groupName === 'AdminZone' );
               if( adminZone && adminZone.grantLevel >= 112 )
                 return true;

             const currentWorkspaceGrantLevel = this.userProfile()?.groups.find( g => g.groupId === this.currentWorkspace()?.groupId )?.grantLevel ?? 0;
             return currentWorkspaceGrantLevel >= 112;
           } );
           readonly isAdmin: Signal<boolean> = this.#isAdmin.asReadonly();

           """ into <PostLocalVariables>;
end
