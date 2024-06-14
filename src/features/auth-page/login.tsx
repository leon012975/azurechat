"use client";
import { FC, useEffect } from "react";
import { signIn } from "next-auth/react";
import { Avatar, AvatarImage } from "../ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { AI_NAME } from "@/features/theme/theme-config";

interface LoginProps {}

export const LogIn: FC<LoginProps> = () => {
  useEffect(() => {
    signIn("azure-ad");
  }, []);

  return (
    <Card className="flex gap-2 flex-col min-w-[300px]">
      <CardHeader className="gap-2">
        <CardTitle className="text-2xl flex gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={"ai-icon.png"} />
          </Avatar>
          <span className="text-primary">{AI_NAME}</span>
        </CardTitle>
        <CardDescription>
          Redirecting to Microsoft 365 login...
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {/* This section is intentionally left empty as we are redirecting */}
      </CardContent>
    </Card>
  );
};
