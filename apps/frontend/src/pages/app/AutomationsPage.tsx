import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Zap, ToggleLeft, ToggleRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
}

export default function AutomationsPage() {
  const [rules] = useState<AutomationRule[]>([]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="font-display font-bold text-lg leading-tight">Automations</h2>
            <p className="text-xs text-muted-foreground">Automate repetitive tasks</p>
          </div>
          <Badge variant="secondary">{rules.length} rule{rules.length !== 1 ? 's' : ''}</Badge>
        </div>
        <Button
          variant="brand"
          size="sm"
          onClick={() => toast.info('Automation builder coming soon')}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Create Automation
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {rules.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 gap-5"
          >
            <div className="relative">
              <div className="h-20 w-20 rounded-3xl bg-brand-50 dark:bg-brand-950 flex items-center justify-center">
                <Zap className="h-10 w-10 text-brand-500" />
              </div>
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-amber-400 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                0
              </span>
            </div>
            <div className="text-center max-w-xs">
              <h3 className="font-semibold text-lg mb-1.5">No automations yet</h3>
              <p className="text-sm text-muted-foreground">
                Create automation rules to trigger actions automatically
              </p>
            </div>
            <Button
              variant="brand"
              onClick={() => toast.info('Automation builder coming soon')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create your first automation
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-2 max-w-3xl">
            {rules.map((rule, i) => (
              <AutomationRuleRow key={rule.id} rule={rule} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AutomationRuleRow({ rule, index }: { rule: AutomationRule; index: number }) {
  const [enabled, setEnabled] = useState(rule.enabled);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center justify-between rounded-xl border bg-card px-4 py-3.5 shadow-sm hover:border-brand-200 dark:hover:border-brand-800 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0', enabled ? 'bg-brand-100 dark:bg-brand-950' : 'bg-muted')}>
          <Zap className={cn('h-4 w-4', enabled ? 'text-brand-500' : 'text-muted-foreground')} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{rule.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            When <span className="font-medium text-foreground">{rule.trigger}</span> → {rule.action}
          </p>
        </div>
      </div>
      <button
        onClick={() => setEnabled((e) => !e)}
        className="flex-shrink-0 ml-4 transition-colors"
        aria-label={enabled ? 'Disable automation' : 'Enable automation'}
      >
        {enabled ? (
          <ToggleRight className="h-6 w-6 text-brand-500" />
        ) : (
          <ToggleLeft className="h-6 w-6 text-muted-foreground" />
        )}
      </button>
    </motion.div>
  );
}
