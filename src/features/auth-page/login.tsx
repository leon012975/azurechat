"use client";
import { AI_NAME } from "@/features/theme/theme-config";
import { signIn, useSession } from "next-auth/react";
import { FC, useEffect } from "react";
import { Avatar, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";

interface LoginProps {
  isDevMode: boolean;
}

export const LogIn: FC<LoginProps> = (props) => {
  const { status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      signIn("azure-ad"); // 你可以根据需要更换为 'github'
    }
  }, [status]);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (status === 'authenticated') {
    return <div>Welcome, {AI_NAME}!</div>;
  }

  // 如果用户未认证，不显示任何内容
  return null;
};

export default LogIn;
