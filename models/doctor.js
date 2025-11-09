import mongoose from "mongoose"

const doctorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    firstName: String,
    lastName: String,
    licenseNumber: String,
    specialization: String,
    email: String,
    phone: String,
    country: {
      type: String,
      default: "NG",
    },
    organizations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        maxlength: 3,
      },
    ],
  },
  { timestamps: true },
)

export default mongoose.model("Doctor", doctorSchema)
