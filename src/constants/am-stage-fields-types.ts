/** 由 crm-am端信息确认版.xlsx 导出，并按 CRM 反馈扩展 */
export type AmStageFieldDef = {
  key: string;
  label: string;
  type: string;
  /**
   * 推进阶段是否必填。缺省为选填（细节-2：留白也可保存并进入下一阶段）。
   * 仅显式 `required: true` 才会拦截 Advance。
   */
  required?: boolean;
  /** Select 类型的可选值（存 value 字符串） */
  options?: string[];
  /** 仅当同阶段某字段取值命中时显示（如双胎第二组宝宝） */
  showWhen?: { key: string; values: string[] };
  /** 仅内部（Admin/CM）可见；不对准父母/代孕母门户暴露 */
  internalOnly?: boolean;
};

export type AmStageFieldGroup = {
  stage: string;
  fields: AmStageFieldDef[];
};
