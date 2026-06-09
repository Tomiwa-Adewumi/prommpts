import React, { useState } from 'react';

interface FolderProps {
    color?: string;
    size?: number;
    items?: React.ReactNode[];
    className?: string;
    isOpen?: boolean;
}

const darkenColor = (hex: string, percent: number): string => {
    let color = hex.startsWith('#') ? hex.slice(1) : hex;
    if (color.length === 3) {
        color = color
            .split('')
            .map(c => c + c)
            .join('');
    }
    const num = parseInt(color, 16);
    let r = (num >> 16) & 0xff;
    let g = (num >> 8) & 0xff;
    let b = num & 0xff;
    r = Math.max(0, Math.min(255, Math.floor(r * (1 - percent))));
    g = Math.max(0, Math.min(255, Math.floor(g * (1 - percent))));
    b = Math.max(0, Math.min(255, Math.floor(b * (1 - percent))));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
};

const Folder: React.FC<FolderProps> = ({ color = '#27282D', size = 1, items = [], className = '', isOpen: controlledOpen }) => {
    const maxItems = 3;
    // Only take provided items, do NOT pad with nulls
    const papers = items.slice(0, maxItems);

    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;

    const [paperOffsets, setPaperOffsets] = useState<{ x: number; y: number }[]>(
        Array.from({ length: maxItems }, () => ({ x: 0, y: 0 }))
    );

    const folderBackColor = darkenColor(color, 0.08);
    const paper1 = darkenColor('#ffffff', 0.1);
    const paper2 = darkenColor('#ffffff', 0.05);
    const paper3 = '#ffffff';

    const handleClick = () => {
        if (!isControlled) {
            setInternalOpen(prev => !prev);
        }
        if (open) {
            setPaperOffsets(Array.from({ length: maxItems }, () => ({ x: 0, y: 0 })));
        }
    };

    const handlePaperMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, index: number) => {
        if (!open) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const offsetX = (e.clientX - centerX) * 0.15;
        const offsetY = (e.clientY - centerY) * 0.15;
        setPaperOffsets(prev => {
            const newOffsets = [...prev];
            newOffsets[index] = { x: offsetX, y: offsetY };
            return newOffsets;
        });
    };

    const handlePaperMouseLeave = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, index: number) => {
        setPaperOffsets(prev => {
            const newOffsets = [...prev];
            newOffsets[index] = { x: 0, y: 0 };
            return newOffsets;
        });
    };

    const folderStyle: React.CSSProperties = {
        '--folder-color': color,
        '--folder-back-color': folderBackColor,
        '--paper-1': paper1,
        '--paper-2': paper2,
        '--paper-3': paper3
    } as React.CSSProperties;

    const scaleStyle = { transform: `scale(${size})` };

    const getOpenTransform = (index: number) => {
        // If single item, just peek straight up
        if (papers.length === 1) return 'translate(-50%, -70%)';

        // Stack peek for multiple items
        if (index === 0) return 'translate(-50%, -85%) scale(0.95)';
        if (index === 1) return 'translate(-50%, -75%) scale(0.98)';
        if (index === 2) return 'translate(-50%, -65%) scale(1)';

        return 'translate(-50%, -70%)';
    };

    return (
        <div style={scaleStyle} className={className}>
            <div
                className={`group relative transition-all duration-200 ease-in cursor-pointer ${!open ? 'hover:-translate-y-2' : ''
                    }`}
                style={{
                    ...folderStyle,
                    transform: open ? 'translateY(-8px)' : undefined
                }}
                onClick={handleClick}
            >
                <div
                    className="relative w-[100px] h-[80px] rounded-tl-0 rounded-tr-[10px] rounded-br-[10px] rounded-bl-[10px]"
                    style={{ backgroundColor: folderBackColor }}
                >
                    <span
                        className="absolute z-0 bottom-[98%] left-0 w-[30px] h-[10px] rounded-tl-[5px] rounded-tr-[5px] rounded-bl-0 rounded-br-0"
                        style={{ backgroundColor: folderBackColor }}
                    ></span>
                    {/* Thumbnail row - displayed from left edge */}
                    <div
                        className={`absolute z-20 left-[8%] bottom-[30%] flex gap-1 transition-all duration-300 ease-in-out ${!open
                            ? 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
                            : 'opacity-100 translate-y-0'
                            }`}
                    >
                        {papers.map((item, i) => {
                            // Calculate card width based on number of items
                            // More items = smaller cards to fit in row
                            const cardWidth = papers.length === 1
                                ? 'w-[35px]'
                                : papers.length === 2
                                    ? 'w-[28px]'
                                    : 'w-[22px]';

                            return (
                                <div
                                    key={i}
                                    className={`${cardWidth} h-[40px] rounded-[4px] overflow-hidden shadow-sm transition-transform duration-300 ${open ? 'hover:scale-110' : ''
                                        }`}
                                    style={{
                                        backgroundColor: i === 0 ? paper1 : i === 1 ? paper2 : paper3,
                                    }}
                                >
                                    {item}
                                </div>
                            );
                        })}
                    </div>
                    <div
                        className={`absolute z-30 w-full h-full origin-bottom transition-all duration-300 ease-in-out ${!open ? 'group-hover:[transform:skew(15deg)_scaleY(0.6)]' : ''
                            }`}
                        style={{
                            backgroundColor: color,
                            borderRadius: '5px 10px 10px 10px',
                            ...(open && { transform: 'skew(15deg) scaleY(0.6)' })
                        }}
                    ></div>
                    <div
                        className={`absolute z-30 w-full h-full origin-bottom transition-all duration-300 ease-in-out ${!open ? 'group-hover:[transform:skew(-15deg)_scaleY(0.6)]' : ''
                            }`}
                        style={{
                            backgroundColor: color,
                            borderRadius: '5px 10px 10px 10px',
                            ...(open && { transform: 'skew(-15deg) scaleY(0.6)' })
                        }}
                    ></div>
                </div>
            </div>
        </div>
    );
};

export default Folder;
