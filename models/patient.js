import mongoose from "mongoose"

const patientSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: String,
    phone: String,
    dateOfBirth: Date,
    medicalRecordNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    notes: String,
  },
  { timestamps: true },
)


export default mongoose.model("Patient", patientSchema)
