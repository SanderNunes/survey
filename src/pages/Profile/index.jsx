import ProfileSummary from '@/components/ProfileSummary';
import ProfileTabs from '@/components/ProfileTabs/ProfileTabs';
import { useAuth } from '@/hooks/useAuth';
import React from 'react';

export default function ProfilePage() {
  const { userProfile } = useAuth();


  if (!userProfile) {
    return <></>
  }

  return (
    <>
    <div className='container my-8'>
      <ProfileSummary user={userProfile}/>
      <ProfileTabs user={userProfile}/>
    </div>
    </>
  );
}
