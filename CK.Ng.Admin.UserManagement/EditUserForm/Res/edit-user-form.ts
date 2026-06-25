import { Component, OnInit, Signal, inject, viewChild } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { GenericForm, GenericFormData, GetWorkspaceUserEditDataQCommand, GroupInfos, HttpCrisEndpoint, UserWorkspaceGroupPicker, WorkspaceUser } from '@local/ck-gen';

@Component({
    selector: 'ck-edit-user-form',
    templateUrl: './edit-user-form.html',
    styleUrls: ['./edit-user-form.less'],
    imports: [FormsModule, ReactiveFormsModule, NzFormModule, TranslateModule, NzInputModule, FontAwesomeModule, UserWorkspaceGroupPicker, GenericForm]
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
    public eyeIcon = faEye;
    public eyeSlashIcon = faEyeSlash;
    // <PostIconsDefinition />

    // <PreLocalVariables revert />
    public showPassword: boolean = false;
    public workspaceGroups: Array<GroupInfos> = [];
    public user: WorkspaceUser;
    public workspace: GroupInfos;
    // Scalar-field config (firstName/lastName/email) consumed by the GenericForm. The GenericForm
    // also reads it from NZ_MODAL_DATA (modal mode); binding it satisfies its required input.
    public formData: GenericFormData<unknown, unknown>;
    // The custom fields (password + groups) are not GenericForm field types, so they live here.
    public customForm: FormGroup;
    // <PostLocalVariables />

    constructor() {
        this.user = this.#nzModalData.user;
        this.workspace = this.#nzModalData.workspace;
        this.formData = this.#nzModalData.formData;
        // <PreCustomFormDefinition revert />
        this.customForm = new FormGroup({
            // <PrePasswordFormControlDefinition revert />
            password: new FormControl<string>('', { nonNullable: false, validators: [Validators.minLength(6)] }),
            // <PostPasswordFormControlDefinition />
            // <PreGroupsFormControlDefinition revert />
            groups: new FormControl<Array<number>>([], { nonNullable: true, validators: [Validators.required] })
            // <PostGroupsFormControlDefinition />
        });
        // <PostCustomFormDefinition />
    }

    get groupsControl(): FormControl<Array<number>> {
        return this.customForm.get('groups') as FormControl<Array<number>>;
    }

    get valid(): boolean {
        const scalarForm = this.formComponent()?.form();
        return !!scalarForm && scalarForm.valid && this.customForm.valid;
    }

    getValue(): { firstName: string, lastName: string, email: string, cultureName: string, password: string, groups: Array<number> } {
        return { ...this.formComponent()!.form()!.getRawValue(), ...this.customForm.getRawValue() };
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
