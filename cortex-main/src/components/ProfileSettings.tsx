import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  user: any;
}

export default function ProfileSettings({
  open,
  onClose,
  user,
}: Props) {
  const [name, setName] = useState("");
  const [image, setImage] = useState("");

  useEffect(() => {
    const savedName =
      localStorage.getItem("cortex_name") ||
      user?.name ||
      "";

    const savedImage =
      localStorage.getItem("cortex_image") ||
      "";

    setName(savedName);
    setImage(savedImage);
  }, [user]);

  if (!open) return null;

  const save = () => {
    localStorage.setItem("cortex_name", name);
    localStorage.setItem("cortex_image", image);

    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">

      <div className="w-[420px] rounded-2xl bg-neutral-900 border border-white/10 p-6">

        <div className="flex justify-between items-center">

          <h2 className="text-xl font-semibold">
            Profile Settings
          </h2>

          <button onClick={onClose}>
            <X />
          </button>

        </div>

        <div className="mt-6">

          <label className="text-sm text-neutral-400">
            Display Name
          </label>

          <input
            value={name}
            onChange={(e)=>setName(e.target.value)}
            className="w-full mt-2 rounded-lg bg-neutral-800 p-3"
          />

        </div>

        <div className="mt-5">

          <div className="flex flex-col items-center mt-6">

            <div className="relative">

                <img
                src={
                    image ||
                    "/default-avatar.png"
                }
                className="w-24 h-24 rounded-full object-cover border border-white/10"
                />

            </div>

            <input
                id="profile-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                const file = e.target.files?.[0];

                if (!file) return;

                const reader = new FileReader();

                reader.onload = () => {
                    setImage(reader.result as string);
                };

                reader.readAsDataURL(file);
                }}
            />

            <label
                htmlFor="profile-upload"
                className="mt-4 cursor-pointer rounded-lg bg-neutral-800 hover:bg-neutral-700 transition px-4 py-2 text-sm"
            >
                Upload Image
            </label>

            </div>

        </div>

        <button
          onClick={save}
          className="w-full mt-8 rounded-lg bg-white text-black py-3 font-medium"
        >
          Save Changes
        </button>

      </div>

    </div>
  );
}