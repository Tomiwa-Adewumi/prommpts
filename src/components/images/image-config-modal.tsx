import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ImageConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    image: {
        id: string;
        title: string;
        prompt: string;
        model: string;
    };
    onUpdate: (id: string, updates: { prompt: string; ai_model: string }) => void;
}

export function ImageConfigModal({ isOpen, onClose, image, onUpdate }: ImageConfigModalProps) {
    const [prompt, setPrompt] = useState(image.prompt);
    const [model, setModel] = useState(image.model);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setPrompt(image.prompt);
            setModel(image.model);
        }
    }, [isOpen, image]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(`/api/images/${image.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    prompt,
                    ai_model: model,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to update image details");
            }

            const updatedImage = await response.json();
            onUpdate(image.id, { prompt, ai_model: model });
            toast.success("Image details updated successfully");
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Failed to update image details");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>Configure Image Details</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Edit the metadata stored for this uploaded image.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">

                    <div className="space-y-2">
                        <Label htmlFor="model">Model Name</Label>
                        <Input
                            id="model"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="bg-zinc-800 border-zinc-700 text-white focus:border-[#F1E500]"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="prompt">Prompt</Label>
                        <Textarea
                            id="prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="bg-zinc-800 border-zinc-700 text-white focus:border-[#F1E500] min-h-[100px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-zinc-800 hover:text-white">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-gradient-to-b from-[#f8f052] to-[#d4c800] hover:from-[#f9f262] hover:to-[#e0d400] text-black font-bold border-0"
                            disabled={loading}
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
