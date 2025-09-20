import { getInitials } from '@/utils/constants';
import { Building, Mail, Phone } from 'lucide-react';
import React, { useEffect } from 'react';
import FallBackAvatar from '../FallBackAvatar';
import { useGraph } from '@/hooks/useGraph';

export default function ProfileSummary({ user = {} }) {
    const { getMyProfilePhoto, profilePhoto } = useGraph();
    useEffect(() => {
        getMyProfilePhoto()
    }, [getMyProfilePhoto]);
    return (
        <div> 
            <div className="flex flex-col md:flex-row gap-8 items-start mb-12">
                <div className="relative">
                    <FallBackAvatar src={profilePhoto} alt={getInitials(user?.displayName)} className="h-36 w-36 border-4 border-background shadow-md"
                    isDark={true}
                    fontSize='text-6xl'
                    />
                </div>
                <div className="space-y-3 flex-1 ">
                    <h1 className="text-3xl font-semibold tracking-tight">{user?.displayName}</h1>
                    <p className="text-xl text-muted-foreground font-light">{user?.jobTitle}</p>
                    <p className="text-muted-foreground">{user?.profileBeta?.positions[0]?.detail?.company?.department}</p>
                    <div className="flex flex-col sm:flex-row gap-4 mt-4">
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{user?.mail}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{user?.mobilePhone}</span>
                        </div>


                        <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{user?.officeLocation}</span>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
