/** 由 crm-am端信息确认版.xlsx 导出 */
export type AmStageFieldDef = {
  key: string;
  label: string;
  type: string;
};

export type AmStageFieldGroup = {
  stage: string;
  fields: AmStageFieldDef[];
};
