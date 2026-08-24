import { Component, OnInit, Signal, inject, viewChild } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faRotate } from '@fortawesome/free-solid-svg-icons';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { generateStrongPassword, GenericForm, GenericFormData, GetWorkspaceUserEditDataQCommand, GroupInfos, HttpCrisEndpoint, PasswordStrength, passwordComplexityValidator, UserWorkspaceGroupPicker, WorkspaceUser } from '@local/ck-gen';

@Component({
    selector: 'ck-edit-user-form',
    templateUrl: './edit-user-form.html',
    styleUrls: ['./edit-user-form.less'],
    imports: [FormsModule, ReactiveFormsModule, NzFormModule, NzInputModule, NzButtonModule, FontAwesomeModule, TranslateModule, UserWorkspaceGroupPicker, GenericForm, PasswordStrength]
})
export class EditUserForm implements OnInit {
    // <PreViewChildren revert />
    readonly formComponent: Signal<GenericForm | undefined> = viewChild('formComp');
    // <PostViewChildren />

    // <PreDependencyInjection revert />
    readonly #crisEndpoint = inject(HttpCrisEndpoint);
    readonly #nzModalData = inject(NZ_MODAL_DATA);
    // <PostDependencyInjection />

    // <PreInputOutput revert />
    // <PostInputOutput />

    // <PreIconsDefinition revert />
    protected readonly refreshIcon = faRotate;
    // <PostIconsDefinition />

    // <PreLocalVariables revert />
    public workspaceGroups: Array<GroupInfos> = [];
    public user: WorkspaceUser;
    public workspace: GroupInfos;
    // Basic user creation (userId === 0) provisions an initial sign-in password; the edit flow does not.
    public readonly isCreate: boolean;
    // Scalar-field config (firstName/lastName/userName/email) consumed by the GenericForm. The GenericForm
    // also reads it from NZ_MODAL_DATA (modal mode); binding it satisfies its required input.
    public formData: GenericFormData<unknown, unknown>;
    // The groups picker (and, on create, the generated password) are not GenericForm field types, so they live here.
    public customForm: FormGroup;
    // <PostLocalVariables />

    constructor() {
        this.user = this.#nzModalData.user;
        this.workspace = this.#nzModalData.workspace;
        this.formData = this.#nzModalData.formData;
        this.isCreate = this.user.userId === 0;
        // <PreCustomFormDefinition revert />
        const controls: { [key: string]: AbstractControl } = {
            // <PreGroupsFormControlDefinition revert />
            groups: new FormControl<Array<number>>([], { nonNullable: true, validators: [Validators.required] })
            // <PostGroupsFormControlDefinition />
        };
        // On create, the admin sets an initial basic-authentication password (pre-filled with a strong
        // random value, regenerable from the input) so the new user can sign in right away.
        if (this.isCreate) {
            controls['password'] = new FormControl<string>(generateStrongPassword(), {
                nonNullable: true,
                validators: [Validators.required, passwordComplexityValidator]
            });
        }
        this.customForm = new FormGroup(controls);
        // <PostCustomFormDefinition />
    }

    get groupsControl(): FormControl<Array<number>> {
        return this.customForm.get('groups') as FormControl<Array<number>>;
    }

    get passwordControl(): FormControl<string> | null {
        return this.customForm.get('password') as FormControl<string> | null;
    }

    get valid(): boolean {
        const scalarForm = this.formComponent()?.form();
        return !!scalarForm && scalarForm.valid && this.customForm.valid;
    }

    getValue(): { firstName: string, lastName: string, userName: string, email: string, cultureName: string, groups: Array<number>, password?: string } {
        return { ...this.formComponent()!.form()!.getRawValue(), ...this.customForm.getRawValue() };
    }

    // Regenerates the create-flow password into the input (bound to the refresh button).
    regeneratePassword(): void {
        this.passwordControl?.setValue(generateStrongPassword());
    }

    async ngOnInit(): Promise<void> {
        await this.getEditUserData();
    }

    async getEditUserData(): Promise<void> {
        // <PreGetEditUserData revert />
        const res = await this.#crisEndpoint.sendOrThrowAsync(new GetWorkspaceUserEditDataQCommand(this.user.userId));
        if (res) {
            const groups = [...res.workspaceGroups];
            const userGroups = [...res.userGroups];
            groups.forEach(g => {
                if (g.groupName.includes('Administrators')) {
                    let zoneGroup = { groupId: g.zoneId, groupName: g.zoneName, isZone: false, zoneId: g.zoneId, zoneName: g.zoneName } as GroupInfos;
                    if (!groups.find(group => group.groupId === g.zoneId)) {
                        groups.unshift(zoneGroup);
                    }
                    if (!userGroups.find(group => group.groupId === g.zoneId)) {
                        userGroups.unshift(zoneGroup);
                    }
                }
            });
            this.customForm.patchValue({ groups: userGroups.map(g => g.groupId) });
            this.workspaceGroups = [...groups];
        }
        // <PostGetEditUserData />
    }
}
