import mongoose from "mongoose"

const patientSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    middleName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    maritalStatus: {
      type: String,
      enum: ["single", "married", "divorced", "widowed"],
    },
    nationality: String,
    address: String,
    city: String,
    state: String,
    country: String,
    emergencyContactName: String,
    emergencyContactPhone: String,
    emergencyContactRelationship: String,
    bloodGroup: {
      type: String,
      enum: ["o-", "o+", "a-", "a+", "b-", "b+", "ab-", "ab+"],
    },
    genotype: {
      type: String,
      enum: ["aa", "as", "ss"],
    },
    allergies: [String],
    chronicConditions: [String],
    medications: [String],
    previousSurgeries: [String],
    familyHistory: String,
    status: {
      type: String,
      enum: ["active", "inactive", "deceased"],
      default: "active",
    },
    medicalRecordNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    insuranceProvider: String,
    insuranceNumber: String,
    occupation: String,
    nextOfKinName: String,
    nextOfKinRelationship: String,
    nextOfKinPhone: String,
    passport: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
    },
    medicalRecords: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MedicalRecord",
      },
    ],
    notes: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdByType: {
      type: String,
      enum: ["doctor", "organization"],
    },
    canBeDeleted: {
      type: Boolean,
      default: false,
    },
    profilePicture: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
  },
  { timestamps: true },
)

export default mongoose.model("Patient", patientSchema)
