import mongoose from "mongoose"

const organizationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organizationName: {
      type: String,
      required: true,
      trim: true,
    },
    registrationNumber: String,
    adminFirstName: String,
    adminLastName: String,
    adminEmail: String,
    companyEmail: String,
    companyPhone: String,
    country: {
      type: String,
      default: "NG",
    },
    doctors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor",
      },
    ],
    staff: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Staff",
      },
    ],
  },
  { timestamps: true },
)

export default mongoose.model("Organization", organizationSchema)
