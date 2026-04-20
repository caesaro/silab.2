export interface Student {
  name: string;
  nim: string;
}

export interface LetterAsset {
  imageBase64: string;
  fileName: string;
  mimeType?: string;
}

export interface TULetterBackgrounds {
  activeStudent: LetterAsset;
  observation: LetterAsset;
}

export interface LetterLayout {
  marginTopMm: number;
  marginRightMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
}

export interface TULetterLayouts {
  activeStudent: LetterLayout;
  observation: LetterLayout;
}

export interface ObservationData {
  recipientName: string;
  companyName: string;
  companyAddress: string;
  courseName: string;
  lecturerName: string;
  lecturerNidn: string;
  headOfProgramName: string;
  headOfProgramNidn: string;
  students: Student[];
}

export interface ActiveStudentRequest {
  id: string;
  name: string;
  nim: string;
  email: string;
  transcriptBase64: string;
  transcriptName: string;
  status: 'pending' | 'verified' | 'sent';
  createdAt: string;
  signatureBase64?: string;
  stampBase64?: string;
  semesterCode?: string;
  semesterName?: string;
  academicYear?: string;
  letterNumber?: string;
  letterGeneratedAt?: string;
}
